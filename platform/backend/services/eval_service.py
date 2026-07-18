"""Offline evaluation for the chat assistant.

Run with:
    python platform/backend/services/eval_service.py
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import sys

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_PLATFORM_DIR = _PROJECT_ROOT / "platform"
for _p in (_PROJECT_ROOT, _PLATFORM_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from backend.services.chat_service import ChatService


@dataclass(frozen=True)
class BenchmarkCase:
    question: str
    expected_intent: str


BENCHMARKS: list[BenchmarkCase] = [
    BenchmarkCase("Why was TXN-000123 flagged?", "alert_lookup"),
    BenchmarkCase("Find cases similar to TXN-000123", "similar_cases"),
    BenchmarkCase("What time patterns exist in flagged transactions?", "pattern_analysis"),
    BenchmarkCase("Give me a summary of high-risk activity", "report_request"),
    BenchmarkCase("Why was TXN-000999 flagged?", "alert_lookup"),
    BenchmarkCase("What amount buckets are most common?", "pattern_analysis"),
]


def evaluate_case(service: ChatService, case: BenchmarkCase) -> dict:
    response = service.ask(case.question)
    intent_ok = response["intent"] == case.expected_intent
    grounded = bool(response.get("sources"))
    cited = bool(response.get("citations"))
    verified = bool(response.get("verified"))
    score = round(
        (1.0 if intent_ok else 0.0)
        + (1.0 if grounded else 0.0)
        + (1.0 if cited else 0.0)
        + (1.0 if verified else 0.0),
        2,
    )
    return {
        "question": case.question,
        "expected_intent": case.expected_intent,
        "intent": response["intent"],
        "intent_ok": intent_ok,
        "grounded": grounded,
        "cited": cited,
        "verified": verified,
        "confidence": response.get("confidence", 0.0),
        "latency_ms": response.get("latency_ms", 0),
        "score": score,
    }


def run_evaluation() -> dict:
    service = ChatService()
    results = [evaluate_case(service, case) for case in BENCHMARKS]
    average_score = round(sum(item["score"] for item in results) / len(results), 2) if results else 0.0
    intent_accuracy = round(sum(1 for item in results if item["intent_ok"]) / len(results), 2) if results else 0.0
    citation_coverage = round(sum(1 for item in results if item["cited"]) / len(results), 2) if results else 0.0
    groundedness = round(sum(1 for item in results if item["grounded"]) / len(results), 2) if results else 0.0
    return {
        "summary": {
            "cases": len(results),
            "average_score": average_score,
            "intent_accuracy": intent_accuracy,
            "citation_coverage": citation_coverage,
            "groundedness": groundedness,
        },
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fail-under", type=float, default=2.5, help="Fail if average score drops below this threshold.")
    args = parser.parse_args()

    payload = run_evaluation()
    print(json.dumps(payload, indent=2))
    if payload["summary"]["average_score"] < args.fail_under:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
