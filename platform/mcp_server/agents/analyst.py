"""Answers `pattern_analysis` questions using real aggregate statistics."""

from __future__ import annotations

from mcp_server.agents.base import Agent, AgentResponse
from mcp_server.tools import stats_tools
from mcp_server.tools.evidence import citation, tool_trace


class AnalystAgent(Agent):
    name = "analyst"

    def respond(self, question: str, emit=None) -> AgentResponse:
        if emit:
            emit("tool_call_started", {"tool": "stats_tools.alerts_by_hour", "agent": self.name})
        by_hour = stats_tools.alerts_by_hour()
        if emit:
            emit("tool_result_received", {"tool": "stats_tools.alerts_by_hour", "items": len(by_hour)})
            emit("tool_call_started", {"tool": "stats_tools.alerts_by_amount_bucket", "agent": self.name})
        by_amount = stats_tools.alerts_by_amount_bucket()
        if emit:
            emit("tool_result_received", {"tool": "stats_tools.alerts_by_amount_bucket", "items": len(by_amount)})
            emit("tool_call_started", {"tool": "stats_tools.tier_distribution", "agent": self.name})
        tiers = stats_tools.tier_distribution()
        if emit:
            emit("tool_result_received", {"tool": "stats_tools.tier_distribution", "items": len(tiers)})

        if not by_hour and not by_amount:
            return AgentResponse(
                answer="No alerts are available yet to analyze patterns from.",
                sources=["stats_tools.alerts_by_hour", "stats_tools.alerts_by_amount_bucket"],
                citations=[
                    citation(
                        source="stats",
                        tool="stats_tools.alerts_by_hour",
                        reference="dashboard",
                        field="by_hour",
                        value=by_hour,
                        snippet="Pattern analysis over alerts by hour.",
                    )
                ],
                tool_trace=[
                    tool_trace(tool="stats_tools.alerts_by_hour", action="read"),
                    tool_trace(tool="stats_tools.alerts_by_amount_bucket", action="read"),
                    tool_trace(tool="stats_tools.tier_distribution", action="read"),
                ],
                confidence=0.45,
            )

        peak_hour = max(by_hour, key=by_hour.get) if by_hour else "unknown"
        peak_bucket = max(by_amount, key=by_amount.get) if by_amount else "unknown"

        answer = (
            f"The busiest flagged hour is {peak_hour} with {by_hour.get(peak_hour, 0)} alerts. "
            f"The most common flagged amount range is {peak_bucket} "
            f"({by_amount.get(peak_bucket, 0)} alerts). "
            f"Tier distribution: {tiers}."
        )
        return AgentResponse(
            answer=answer,
            sources=["stats_tools.alerts_by_hour", "stats_tools.alerts_by_amount_bucket", "stats_tools.tier_distribution"],
            citations=[
                citation(source="stats", tool="stats_tools.alerts_by_hour", reference="dashboard", field="by_hour", value=by_hour),
                citation(source="stats", tool="stats_tools.alerts_by_amount_bucket", reference="dashboard", field="by_amount_bucket", value=by_amount),
                citation(source="stats", tool="stats_tools.tier_distribution", reference="dashboard", field="tier_distribution", value=tiers),
            ],
            tool_trace=[
                tool_trace(tool="stats_tools.alerts_by_hour", action="read"),
                tool_trace(tool="stats_tools.alerts_by_amount_bucket", action="read"),
                tool_trace(tool="stats_tools.tier_distribution", action="read"),
            ],
            confidence=0.9,
        )
