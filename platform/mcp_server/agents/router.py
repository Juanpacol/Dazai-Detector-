"""Classifies a question into one of 4 intents and dispatches to the matching
specialist agent.

Router + Factory pattern: keyword-based classification keeps intent routing
deterministic and explainable for the demo — no LLM call is needed just to
decide which agent should answer, which also means the router itself can
never hallucinate.
"""

from __future__ import annotations

import re
import time
from typing import Callable

from mcp_server.agents.analyst import AnalystAgent
from mcp_server.agents.base import AgentResponse
from mcp_server.agents.investigator import InvestigatorAgent
from mcp_server.agents.reporter import ReporterAgent
from mcp_server.agents.verifier import VerifierAgent

INTENTS = ("alert_lookup", "similar_cases", "pattern_analysis", "report_request")

_ALERT_ID_RE = re.compile(r"TXN-\d+", re.IGNORECASE)
_SIMILAR_KEYWORDS = ("similar", "like this", "related", "resembl")
_PATTERN_KEYWORDS = ("pattern", "hour", "time of day", "trend", "distribution", "when do")
_REPORT_KEYWORDS = ("summary", "report", "overview", "how many high", "high-risk activity")
_LOOKUP_KEYWORDS = ("why was", "why is", "why did", "why were")

# Order matters: more specific signals (an explicit alert ID, "similar") are
# checked before generic ones. A word like "flagged" appears across every
# intent's phrasing, so it is deliberately NOT used as a standalone signal —
# only an explicit transaction ID or a narrow "why was/is/did" phrase counts
# as an alert_lookup signal, so pattern/report questions that merely mention
# "flagged transactions" aren't misrouted into alert_lookup.


def classify(question: str) -> str:
    lowered = question.lower()

    if any(k in lowered for k in _SIMILAR_KEYWORDS):
        return "similar_cases"
    if _ALERT_ID_RE.search(question):
        return "alert_lookup"
    if any(k in lowered for k in _PATTERN_KEYWORDS):
        return "pattern_analysis"
    if any(k in lowered for k in _REPORT_KEYWORDS):
        return "report_request"
    if any(k in lowered for k in _LOOKUP_KEYWORDS):
        return "alert_lookup"

    return "pattern_analysis"  # safest, always-answerable default


class IntentRouter:
    def __init__(self):
        self._agents = {
            "alert_lookup": InvestigatorAgent(),
            "similar_cases": InvestigatorAgent(),
            "pattern_analysis": AnalystAgent(),
            "report_request": ReporterAgent(),
        }
        self._verifier = VerifierAgent()

    def dispatch(self, question: str, emit: Callable[[str, dict], None] | None = None) -> dict:
        started = time.perf_counter()
        intent = classify(question)
        agent = self._agents[intent]
        if emit:
            emit("intent_detected", {"intent": intent, "agent": agent.name})
        response: AgentResponse = agent.respond(question, emit=emit)
        if emit:
            emit(
                "draft_answer",
                {
                    "intent": intent,
                    "agent": agent.name,
                    "answer": response.answer,
                    "sources": response.sources,
                    "citations": response.citations,
                    "confidence": response.confidence,
                    "tool_trace": response.tool_trace,
                },
            )
            emit("verification_started", {"intent": intent, "agent": agent.name})
        verification = self._verifier.review(question, intent, response)
        response.verified = verification.verified
        response.confidence = verification.confidence
        response.ok = response.ok and verification.ok
        if emit:
            emit(
                "verification_result",
                {
                    "verified": verification.verified,
                    "confidence": verification.confidence,
                    "notes": verification.notes,
                },
            )
        latency_ms = int((time.perf_counter() - started) * 1000)
        return {
            "intent": intent,
            "agent": agent.name,
            "answer": response.answer,
            "sources": response.sources,
            "citations": response.citations,
            "confidence": response.confidence,
            "tool_trace": response.tool_trace,
            "latency_ms": latency_ms,
            "verified": response.verified,
            "ok": response.ok,
        }
