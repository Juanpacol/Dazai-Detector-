"""Backend entry point into the shared multi-agent chat.

The backend and the MCP server both call `IntentRouter` directly — one agent
implementation, two transports (REST here, MCP tool call in `mcp_server/server.py`).

This layer is the one place responsible for turning any failure — a blank
question, a tool exploding, RAG/Chroma being unreachable — into a friendly,
demo-safe answer instead of a raw 500. The router/agents/tools are trusted to
raise on bad state; this is the boundary that catches it.
"""

from __future__ import annotations

import json
import queue
import threading
import time

SUPPORTED_QUESTIONS = (
    "Why was a specific alert flagged? (mention its ID, e.g. TXN-000123)",
    "What time/amount patterns exist across flagged transactions?",
    "Which past cases are similar to a given alert?",
    "Can you summarize current high-risk activity?",
)

_FALLBACK_ANSWER = (
    "I couldn't answer that from the data I have. Try one of these instead:\n- "
    + "\n- ".join(SUPPORTED_QUESTIONS)
)


class ChatService:
    def __init__(self):
        # Imported lazily so a broken agent/tool import surfaces as a clean
        # fallback on first use rather than crashing the whole backend at
        # startup.
        from mcp_server.agents.router import IntentRouter

        self._router = IntentRouter()

    def ask(self, question: str, emit=None) -> dict:
        started = time.perf_counter()
        if not question or not question.strip():
            return self._fallback(latency_ms=0)

        try:
            response = self._router.dispatch(question, emit=emit)
        except Exception:
            response = self._fallback()
        response["latency_ms"] = int((time.perf_counter() - started) * 1000)
        return response

    def stream(self, question: str):
        event_queue: queue.Queue = queue.Queue()

        def emit(event_type: str, payload: dict):
            event_queue.put((event_type, payload))

        def worker():
            try:
                emit("status", {"phase": "started"})
                response = self.ask(question, emit=emit)
                event_queue.put(("final", response))
            except Exception as exc:  # pragma: no cover - safety net for demo stability
                event_queue.put(("error", {"message": str(exc)}))
            finally:
                event_queue.put(None)

        threading.Thread(target=worker, daemon=True).start()

        while True:
            item = event_queue.get()
            if item is None:
                break
            event_type, payload = item
            yield self._sse(event_type, payload)

    def _fallback(self, latency_ms: int = 0) -> dict:
        return {
            "intent": "fallback",
            "agent": "system",
            "answer": _FALLBACK_ANSWER,
            "sources": [],
            "citations": [],
            "tool_trace": [],
            "confidence": 0.0,
            "latency_ms": latency_ms,
            "verified": False,
            "ok": False,
        }

    @staticmethod
    def _sse(event_type: str, payload: dict) -> str:
        return f"event: {event_type}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
