"""Answers `alert_lookup` and `similar_cases` questions."""

from __future__ import annotations

import re

from mcp_server.agents.base import Agent, AgentResponse
from mcp_server.tools import alert_tools, rag_tools
from mcp_server.tools.evidence import citation, tool_trace

_ALERT_ID_RE = re.compile(r"TXN-\d+", re.IGNORECASE)


def _extract_alert_id(question: str) -> str | None:
    match = _ALERT_ID_RE.search(question)
    return match.group(0).upper() if match else None


class InvestigatorAgent(Agent):
    name = "investigator"

    def respond(self, question: str, emit=None) -> AgentResponse:
        lowered = question.lower()
        if "similar" in lowered or "like this" in lowered or "related" in lowered:
            return self._respond_similar(question, emit=emit)
        return self._respond_lookup(question, emit=emit)

    def _respond_lookup(self, question: str, emit=None) -> AgentResponse:
        alert_id = _extract_alert_id(question)
        if not alert_id:
            return AgentResponse(
                answer=(
                    "I couldn't find a transaction ID in your question (expected a format "
                    "like TXN-000123). Please include the alert ID you want to investigate."
                ),
                sources=[],
                confidence=0.2,
                ok=False,
            )

        if emit:
            emit("tool_call_started", {"tool": "alert_tools.get_alert", "agent": self.name, "alert_id": alert_id})
        alert = alert_tools.get_alert(alert_id)
        if emit:
            emit("tool_result_received", {"tool": "alert_tools.get_alert", "alert_id": alert_id, "found": bool(alert)})

        if not alert:
            return AgentResponse(
                answer=f"No alert with ID {alert_id} was found in the current dataset.",
                sources=["alert_tools.get_alert"],
                citations=[
                    citation(
                        source="alert",
                        tool="alert_tools.get_alert",
                        reference=alert_id,
                        field="id",
                        value=alert_id,
                        snippet="Alert lookup returned no record.",
                    )
                ],
                tool_trace=[tool_trace(tool="alert_tools.get_alert", action="read", details={"alert_id": alert_id})],
                confidence=0.35,
                ok=False,
            )

        top_features = ", ".join(f["feature"] for f in alert.get("shap_explanation", [])[:3])
        narrative = alert.get("narrative", "")
        citations = [
            citation(source="alert", tool="alert_tools.get_alert", reference=alert_id, field="amount", value=alert["amount"]),
            citation(source="alert", tool="alert_tools.get_alert", reference=alert_id, field="risk_score", value=alert["risk_score"]),
            citation(source="alert", tool="alert_tools.get_alert", reference=alert_id, field="risk_tier", value=alert["risk_tier"]),
        ]
        for feature in alert.get("shap_explanation", [])[:2]:
            citations.append(
                citation(
                    source="shap",
                    tool="alert_tools.get_alert",
                    reference=alert_id,
                    field=feature["feature"],
                    value=feature["shap_value"],
                    snippet=f"{feature['feature']} => {feature['direction']}",
                )
            )

        answer = (
            f"Alert {alert_id}: ${alert['amount']:.2f}, tier {alert['risk_tier']} "
            f"(risk score {alert['risk_score']:.2f}). Top contributing features: {top_features}. "
            f"{narrative}"
        ).strip()
        return AgentResponse(
            answer=answer,
            sources=[f"alert_tools.get_alert({alert_id})"],
            citations=citations,
            tool_trace=[tool_trace(tool="alert_tools.get_alert", action="read", details={"alert_id": alert_id})],
            confidence=0.96,
        )

    def _respond_similar(self, question: str, emit=None) -> AgentResponse:
        alert_id = _extract_alert_id(question)
        query = question
        if alert_id:
            alert = alert_tools.get_alert(alert_id)
            if alert:
                query = alert.get("narrative") or f"Amount ${alert['amount']} tier {alert['risk_tier']}"

        if emit:
            emit("tool_call_started", {"tool": "rag_tools.search_similar_cases", "agent": self.name, "query": query})
        hits = rag_tools.search_similar_cases(query, k=5)
        if emit:
            emit("tool_result_received", {"tool": "rag_tools.search_similar_cases", "hits": len(hits)})

        if not hits:
            return AgentResponse(
                answer="No similar cases were found in the alert history.",
                sources=["rag_tools.search_similar_cases"],
                citations=[citation(source="rag", tool="rag_tools.search_similar_cases", reference="chroma", field="query", value=query)],
                tool_trace=[tool_trace(tool="rag_tools.search_similar_cases", action="search", details={"k": 5, "query": query})],
                confidence=0.45,
            )

        summary = "; ".join(f"{h['alert_id']} ({h['metadata']['risk_tier']})" for h in hits)
        return AgentResponse(
            answer=f"Found {len(hits)} similar cases: {summary}.",
            sources=["rag_tools.search_similar_cases"],
            citations=[
                citation(
                    source="rag",
                    tool="rag_tools.search_similar_cases",
                    reference=hit["alert_id"],
                    field="risk_tier",
                    value=hit["metadata"].get("risk_tier"),
                    snippet=hit["snippet"][:180],
                )
                for hit in hits[:3]
            ],
            tool_trace=[tool_trace(tool="rag_tools.search_similar_cases", action="search", details={"k": 5, "query": query})],
            confidence=0.84,
        )
