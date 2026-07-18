from __future__ import annotations

import sys
from pathlib import Path
from unittest import TestCase

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_PLATFORM_DIR = _PROJECT_ROOT / "platform"
for _p in (_PROJECT_ROOT, _PLATFORM_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from backend.services.chat_service import ChatService


class ChatContractTests(TestCase):
    def test_blank_question_returns_full_fallback_contract(self):
        service = ChatService()

        response = service.ask("   ")

        self.assertEqual(response["intent"], "fallback")
        self.assertIn("answer", response)
        self.assertIn("citations", response)
        self.assertIn("tool_trace", response)
        self.assertIn("latency_ms", response)
        self.assertFalse(response["verified"])
        self.assertFalse(response["ok"])

    def test_ask_uses_router_and_preserves_latency(self):
        service = ChatService()

        class DummyRouter:
            def dispatch(self, question, emit=None):
                return {
                    "intent": "pattern_analysis",
                    "agent": "analyst",
                    "answer": "Found a pattern.",
                    "sources": ["stats_tools.summary"],
                    "citations": [{"source": "stats", "tool": "stats_tools.summary", "reference": "dashboard"}],
                    "confidence": 0.8,
                    "tool_trace": [{"tool": "stats_tools.summary", "action": "read"}],
                    "verified": True,
                    "ok": True,
                }

        service._router = DummyRouter()

        response = service.ask("What patterns exist?")

        self.assertEqual(response["intent"], "pattern_analysis")
        self.assertGreaterEqual(response["latency_ms"], 0)
        self.assertTrue(response["verified"])
        self.assertTrue(response["ok"])
        self.assertEqual(len(response["citations"]), 1)
