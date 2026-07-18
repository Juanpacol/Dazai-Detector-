"""Lightweight response verifier.

The verifier does not invent new facts. It checks whether an agent response is
grounded in tool-backed evidence and assigns a conservative confidence score.
"""

from __future__ import annotations

from dataclasses import dataclass

from mcp_server.agents.base import AgentResponse


@dataclass
class VerificationResult:
    verified: bool
    confidence: float
    ok: bool
    notes: str


class VerifierAgent:
    name = "verifier"

    def review(self, question: str, intent: str, response: AgentResponse) -> VerificationResult:
        sources = response.sources or []
        citations = response.citations or []
        tool_trace = response.tool_trace or []

        if not response.answer.strip():
            return VerificationResult(False, 0.0, False, "Empty answer.")

        if not sources or not tool_trace:
            return VerificationResult(False, min(response.confidence, 0.35), False, "Missing grounded evidence.")

        if response.ok is False:
            return VerificationResult(False, min(response.confidence, 0.4), False, "Agent reported a degraded answer.")

        if "couldn't" in response.answer.lower() and not citations:
            return VerificationResult(False, 0.45, False, "Fallback answer without evidence.")

        confidence = max(0.55, min(0.98, response.confidence if response.confidence else 0.7))
        if len(citations) >= 3:
            confidence = min(0.99, confidence + 0.05)

        return VerificationResult(True, confidence, True, "Grounded and cited.")
