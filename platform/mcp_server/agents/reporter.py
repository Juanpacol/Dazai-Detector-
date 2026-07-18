"""Answers `report_request` questions with a live summary of high-risk activity."""

from __future__ import annotations

from mcp_server.agents.base import Agent, AgentResponse
from mcp_server.tools.evidence import citation, tool_trace
from mcp_server.tools import alert_tools, stats_tools

HIGH_RISK_TIERS = {"HIGH", "CRITICAL"}


class ReporterAgent(Agent):
    name = "reporter"

    def respond(self, question: str, emit=None) -> AgentResponse:
        if emit:
            emit("tool_call_started", {"tool": "stats_tools.summary", "agent": self.name})
        summary = stats_tools.summary()
        if emit:
            emit("tool_result_received", {"tool": "stats_tools.summary", "total_alerts": summary["total_alerts"]})
            emit("tool_call_started", {"tool": "alert_tools.all_alerts", "agent": self.name})
        high_risk = [a for a in alert_tools.all_alerts() if a["risk_tier"] in HIGH_RISK_TIERS]
        top = sorted(high_risk, key=lambda a: a["risk_score"], reverse=True)[:5]
        if emit:
            emit("tool_result_received", {"tool": "alert_tools.all_alerts", "high_risk": len(high_risk)})

        if summary["total_alerts"] == 0:
            return AgentResponse(
                answer="No alerts have been generated yet — run the detection pipeline first.",
                sources=["stats_tools.summary"],
                citations=[citation(source="stats", tool="stats_tools.summary", reference="dashboard", field="total_alerts", value=0)],
                tool_trace=[tool_trace(tool="stats_tools.summary", action="read")],
                confidence=0.35,
            )

        top_ids = ", ".join(f"{a['id']} (${a['amount']:.2f})" for a in top) or "none"
        answer = (
            f"There are {summary['total_alerts']} total alerts flagging "
            f"${summary['total_flagged_amount']:,.2f}. Tier breakdown: "
            f"{summary['tier_distribution']}. Top high-risk alerts: {top_ids}."
        )
        return AgentResponse(
            answer=answer,
            sources=["stats_tools.summary", "alert_tools.all_alerts"],
            citations=[
                citation(source="stats", tool="stats_tools.summary", reference="dashboard", field="total_alerts", value=summary["total_alerts"]),
                citation(source="stats", tool="stats_tools.summary", reference="dashboard", field="total_flagged_amount", value=summary["total_flagged_amount"]),
                citation(source="stats", tool="stats_tools.summary", reference="dashboard", field="tier_distribution", value=summary["tier_distribution"]),
            ]
            + [
                citation(
                    source="alert",
                    tool="alert_tools.all_alerts",
                    reference=a["id"],
                    field="risk_score",
                    value=a["risk_score"],
                    snippet=f"{a['id']} {a['risk_tier']} ${a['amount']:.2f}",
                )
                for a in top[:3]
            ],
            tool_trace=[
                tool_trace(tool="stats_tools.summary", action="read"),
                tool_trace(tool="alert_tools.all_alerts", action="read"),
            ],
            confidence=0.9,
        )
