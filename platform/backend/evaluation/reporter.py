"""Formats evaluation runs into JSON and plain-text markdown reports."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


def _format_bool(value: bool) -> str:
    return "pass" if value else "fail"


def build_markdown(report: dict) -> str:
    summary = report["summary"]
    lines = [
        "# Chat Evaluation Report",
        f"Generated: {report['generated_at']}",
        "",
        "## Summary",
        f"- Cases: {summary['cases']}",
        f"- Pass rate: {summary['pass_rate']:.1f}%",
        f"- Average score: {summary['average_score']:.1f}/100",
        f"- Intent accuracy: {summary['intent_accuracy']:.1f}%",
        f"- Citation coverage: {summary['citation_coverage']:.1f}%",
        f"- Groundedness: {summary['groundedness']:.1f}%",
        f"- Average latency: {summary['avg_latency_ms']:.0f} ms",
        f"- P95 latency: {summary['p95_latency_ms']:.0f} ms",
        "",
        "## Quality Gate",
        f"- Status: {_format_bool(report['quality_gate']['passed'])}",
        f"- Threshold: {report['quality_gate']['threshold']:.1f}",
        f"- Reason: {report['quality_gate']['reason']}",
        "",
        "## Cases",
        "",
        "| ID | Intent | Score | Pass | Notes |",
        "|---|---|---:|---|---|",
    ]
    for case in report["results"]:
        notes = "; ".join(case["failures"]) if case["failures"] else "ok"
        lines.append(
            f"| {case['id']} | {case['intent']} | {case['score']:.1f} | "
            f"{_format_bool(case['passed'])} | {notes} |"
        )

    if report["failures"]:
        lines += ["", "## Failures", ""]
        for case in report["failures"]:
            lines.append(f"- {case['id']}: {', '.join(case['failures'])}")

    if report.get("grader_summary"):
        lines += ["", "## LLM Grader Notes", ""]
        for line in report["grader_summary"].splitlines():
            lines.append(f"- {line}")

    return "\n".join(lines) + "\n"


def write_report(report: dict, output_dir: Path) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    json_path = output_dir / f"eval_{timestamp}.json"
    md_path = output_dir / f"eval_{timestamp}.md"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))
    md_path.write_text(build_markdown(report))
    return json_path, md_path
