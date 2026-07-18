from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path
from unittest import TestCase

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_PLATFORM_DIR = _PROJECT_ROOT / "platform"
for _p in (_PROJECT_ROOT, _PLATFORM_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from backend.evaluation.harness import EvaluationHarness, load_benchmarks


class DummyService:
    def ask(self, question: str, emit=None) -> dict:
        if "TXN-014346" in question and "similar" not in question.lower():
            return {
                "intent": "alert_lookup",
                "agent": "investigator",
                "answer": "Alert TXN-014346 is HIGH tier with risk score 1.00.",
                "sources": ["alert_tools.get_alert"],
                "citations": [{"source": "alert", "tool": "alert_tools.get_alert", "reference": "TXN-014346"}],
                "confidence": 0.9,
                "tool_trace": [{"tool": "alert_tools.get_alert", "action": "read"}],
                "latency_ms": 10,
                "verified": True,
                "ok": True,
            }
        if "similar" in question.lower():
            return {
                "intent": "similar_cases",
                "agent": "investigator",
                "answer": "Found 3 similar cases.",
                "sources": ["rag_tools.search_similar_cases"],
                "citations": [{"source": "rag", "tool": "rag_tools.search_similar_cases", "reference": "TXN-014346"}],
                "confidence": 0.8,
                "tool_trace": [{"tool": "rag_tools.search_similar_cases", "action": "search"}],
                "latency_ms": 10,
                "verified": True,
                "ok": True,
            }
        if "summary of high-risk activity" in question.lower():
            return {
                "intent": "report_request",
                "agent": "reporter",
                "answer": "There are 90 total alerts and a clear tier breakdown.",
                "sources": ["stats_tools.summary", "alert_tools.all_alerts"],
                "citations": [{"source": "stats", "tool": "stats_tools.summary", "reference": "dashboard"}],
                "confidence": 0.85,
                "tool_trace": [{"tool": "stats_tools.summary", "action": "read"}],
                "latency_ms": 12,
                "verified": True,
                "ok": True,
            }
        if "999999" in question:
            return {
                "intent": "alert_lookup",
                "agent": "investigator",
                "answer": "No alert with ID TXN-999999 was found in the current dataset.",
                "sources": ["alert_tools.get_alert"],
                "citations": [{"source": "alert", "tool": "alert_tools.get_alert", "reference": "TXN-999999"}],
                "confidence": 0.3,
                "tool_trace": [{"tool": "alert_tools.get_alert", "action": "read"}],
                "latency_ms": 9,
                "verified": False,
                "ok": False,
            }
        return {
            "intent": "pattern_analysis",
            "agent": "analyst",
            "answer": "The busiest flagged hour is 14 with 12 alerts.",
            "sources": ["stats_tools.alerts_by_hour", "stats_tools.alerts_by_amount_bucket"],
            "citations": [{"source": "stats", "tool": "stats_tools.alerts_by_hour", "reference": "dashboard"}],
            "confidence": 0.8,
            "tool_trace": [{"tool": "stats_tools.alerts_by_hour", "action": "read"}],
            "latency_ms": 11,
            "verified": True,
            "ok": True,
        }


class EvaluationHarnessTests(TestCase):
    def test_benchmark_file_is_well_formed(self):
        cases = load_benchmarks()
        self.assertGreaterEqual(len(cases), 6)
        self.assertEqual(len({case.id for case in cases}), len(cases))

    def test_harness_writes_report_and_scores_cases(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            harness = EvaluationHarness(service=DummyService(), output_dir=Path(tmpdir))
            report = harness.run()

            self.assertIn("summary", report)
            self.assertIn("results", report)
            self.assertTrue(Path(report["artifacts"]["json"]).exists())
            self.assertTrue(Path(report["artifacts"]["markdown"]).exists())
            self.assertGreaterEqual(report["summary"]["cases"], 6)
            self.assertGreaterEqual(report["summary"]["average_score"], 80.0)
            self.assertIsInstance(report["failures"], list)

            saved = json.loads(Path(report["artifacts"]["json"]).read_text())
            self.assertEqual(saved["summary"]["cases"], report["summary"]["cases"])
