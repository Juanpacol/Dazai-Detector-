"""Deterministic evaluation harness for the fraud assistant chat."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from backend.services.chat_service import ChatService
from intelligence.pipeline import config

from .ollama_grader import OllamaGrader
from .reporter import write_report

DEFAULT_BENCHMARKS_PATH = Path(__file__).with_name("benchmarks.json")


@dataclass(frozen=True)
class BenchmarkCase:
    id: str
    question: str
    expected_intent: str
    required_phrases: tuple[str, ...] = ()
    any_phrases: tuple[str, ...] = ()
    forbidden_phrases: tuple[str, ...] = ()
    min_sources: int = 1
    min_citations: int = 1
    min_confidence: float = 0.5
    max_latency_ms: int = 3000
    expected_ok: bool = True
    expected_verified: bool = True


@dataclass
class CaseResult:
    id: str
    question: str
    expected_intent: str
    intent: str
    score: float
    passed: bool
    failures: list[str] = field(default_factory=list)
    response: dict = field(default_factory=dict)
    grader_review: dict | None = None


def load_benchmarks(path: Path | None = None) -> list[BenchmarkCase]:
    benchmark_path = path or DEFAULT_BENCHMARKS_PATH
    raw_cases = json.loads(benchmark_path.read_text())
    return [_parse_case(item) for item in raw_cases]


def _parse_case(item: dict) -> BenchmarkCase:
    return BenchmarkCase(
        id=item["id"],
        question=item["question"],
        expected_intent=item["expected_intent"],
        required_phrases=tuple(item.get("required_phrases", [])),
        any_phrases=tuple(item.get("any_phrases", [])),
        forbidden_phrases=tuple(item.get("forbidden_phrases", [])),
        min_sources=int(item.get("min_sources", 1)),
        min_citations=int(item.get("min_citations", 1)),
        min_confidence=float(item.get("min_confidence", 0.5)),
        max_latency_ms=int(item.get("max_latency_ms", 3000)),
        expected_ok=bool(item.get("expected_ok", True)),
        expected_verified=bool(item.get("expected_verified", True)),
    )


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * pct)))
    return float(ordered[index])


class EvaluationHarness:
    def __init__(
        self,
        service: ChatService | None = None,
        grader: OllamaGrader | None = None,
        benchmarks_path: Path | None = None,
        output_dir: Path | None = None,
    ):
        self._service = service or ChatService()
        self._grader = grader or OllamaGrader()
        self._benchmarks_path = benchmarks_path or DEFAULT_BENCHMARKS_PATH
        self._output_dir = output_dir or config.EVALUATIONS_DIR

    def run(self, *, write_artifacts: bool = True) -> dict:
        cases = load_benchmarks(self._benchmarks_path)
        results = [self._run_case(case) for case in cases]
        summary = self._summarize(results)
        report = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "benchmark_source": str(self._benchmarks_path),
            "summary": summary,
            "results": [self._result_dict(result) for result in results],
            "failures": [self._result_dict(result) for result in results if not result.passed],
        }
        report["quality_gate"] = {
            "threshold": 80.0,
            "passed": summary["average_score"] >= 80.0 and summary["intent_accuracy"] >= 80.0 and summary["citation_coverage"] >= 80.0,
            "reason": self._quality_gate_reason(summary),
        }
        if any(result.grader_review for result in results):
            report["grader_summary"] = self._grader_summary(results)
        report["artifacts"] = {}
        if write_artifacts:
            json_path, md_path = write_report(report, self._output_dir)
            report["artifacts"] = {"json": str(json_path), "markdown": str(md_path)}
        return report

    def _run_case(self, case: BenchmarkCase) -> CaseResult:
        response = self._service.ask(case.question)
        grader_review = self._grader.review(self._case_dict(case), response) if self._grader else None
        failures = self._evaluate_case(case, response, grader_review)
        score = self._score_case(case, response, grader_review, failures)
        return CaseResult(
            id=case.id,
            question=case.question,
            expected_intent=case.expected_intent,
            intent=response.get("intent", ""),
            score=score,
            passed=not failures,
            failures=failures,
            response=response,
            grader_review=grader_review,
        )

    def _evaluate_case(self, case: BenchmarkCase, response: dict, grader_review: dict | None) -> list[str]:
        failures: list[str] = []
        answer = str(response.get("answer", ""))
        answer_lower = answer.lower()

        checks = [
            ("intent", response.get("intent") == case.expected_intent),
            ("ok", bool(response.get("ok")) == case.expected_ok),
            ("verified", bool(response.get("verified")) == case.expected_verified),
            ("sources", len(response.get("sources", [])) >= case.min_sources),
            ("citations", len(response.get("citations", [])) >= case.min_citations),
            ("confidence", float(response.get("confidence", 0.0)) >= case.min_confidence),
            ("latency", int(response.get("latency_ms", 0)) <= case.max_latency_ms),
            (
                "required_phrases",
                all(fragment.lower() in answer_lower for fragment in case.required_phrases),
            ),
            (
                "any_phrases",
                not case.any_phrases or any(fragment.lower() in answer_lower for fragment in case.any_phrases),
            ),
            (
                "forbidden_phrases",
                not any(fragment.lower() in answer_lower for fragment in case.forbidden_phrases),
            ),
        ]

        for label, passed in checks:
            if not passed:
                failures.append(label)

        if grader_review is not None:
            overall = float(grader_review.get("overall", 0.0) or 0.0)
            if overall < 0.5:
                failures.append("ollama_grader")

        return failures

    @staticmethod
    def _score_case(case: BenchmarkCase, response: dict, grader_review: dict | None, failures: list[str]) -> float:
        weights = {
            "intent": 25.0,
            "ok": 10.0,
            "verified": 15.0,
            "sources": 10.0,
            "citations": 15.0,
            "confidence": 10.0,
            "latency": 10.0,
            "required_phrases": 5.0,
            "any_phrases": 0.0,
            "forbidden_phrases": 0.0,
            "ollama_grader": 0.0,
        }
        answer_lower = str(response.get("answer", "")).lower()
        checks = {
            "intent": response.get("intent") == case.expected_intent,
            "ok": bool(response.get("ok")) == case.expected_ok,
            "verified": bool(response.get("verified")) == case.expected_verified,
            "sources": len(response.get("sources", [])) >= case.min_sources,
            "citations": len(response.get("citations", [])) >= case.min_citations,
            "confidence": float(response.get("confidence", 0.0)) >= case.min_confidence,
            "latency": int(response.get("latency_ms", 0)) <= case.max_latency_ms,
            "required_phrases": all(fragment.lower() in answer_lower for fragment in case.required_phrases),
            "any_phrases": not case.any_phrases or any(fragment.lower() in answer_lower for fragment in case.any_phrases),
            "forbidden_phrases": not any(fragment.lower() in answer_lower for fragment in case.forbidden_phrases),
            "ollama_grader": grader_review is None or float(grader_review.get("overall", 0.0) or 0.0) >= 0.5,
        }
        total = sum(weights[name] for name, passed in checks.items() if passed)
        return round(total, 2)

    @staticmethod
    def _result_dict(result: CaseResult) -> dict:
        payload = {
            "id": result.id,
            "question": result.question,
            "expected_intent": result.expected_intent,
            "intent": result.intent,
            "score": result.score,
            "passed": result.passed,
            "failures": result.failures,
            "response": result.response,
        }
        if result.grader_review is not None:
            payload["grader_review"] = result.grader_review
        return payload

    @staticmethod
    def _summarize(results: list[CaseResult]) -> dict:
        scores = [result.score for result in results]
        latencies = [float(result.response.get("latency_ms", 0)) for result in results]
        total = len(results) or 1
        return {
            "cases": len(results),
            "average_score": round(sum(scores) / total, 2) if scores else 0.0,
            "pass_rate": round(sum(1 for result in results if result.passed) / total * 100, 1),
            "intent_accuracy": round(sum(1 for result in results if result.intent == result.expected_intent) / total * 100, 1),
            "citation_coverage": round(sum(1 for result in results if len(result.response.get("citations", [])) > 0) / total * 100, 1),
            "groundedness": round(
                sum(1 for result in results if result.response.get("sources") and result.response.get("citations") and result.response.get("verified"))
                / total
                * 100,
                1,
            ),
            "avg_latency_ms": round(sum(latencies) / total, 1) if latencies else 0.0,
            "p95_latency_ms": round(_percentile(latencies, 0.95), 1) if latencies else 0.0,
        }

    @staticmethod
    def _quality_gate_reason(summary: dict) -> str:
        if summary["average_score"] < 80.0:
            return "Average score is below the 80 point gate."
        if summary["intent_accuracy"] < 80.0:
            return "Intent accuracy is below the 80% gate."
        if summary["citation_coverage"] < 80.0:
            return "Citation coverage is below the 80% gate."
        return "All quality thresholds passed."

    @staticmethod
    def _grader_summary(results: list[CaseResult]) -> str:
        lines = []
        for result in results:
            if result.grader_review is None:
                continue
            notes = result.grader_review.get("notes")
            overall = result.grader_review.get("overall")
            lines.append(f"{result.id}: overall={overall} notes={notes}")
        return "\n".join(lines)

    @staticmethod
    def _case_dict(case: BenchmarkCase) -> dict:
        return {
            "id": case.id,
            "question": case.question,
            "expected_intent": case.expected_intent,
        }
