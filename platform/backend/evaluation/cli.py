"""Command line entry point for the evaluation harness."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from intelligence.pipeline import config

from .harness import EvaluationHarness


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the fraud assistant evaluation harness.")
    parser.add_argument("--benchmarks", type=Path, default=None, help="Optional benchmark file to run.")
    parser.add_argument("--output-dir", type=Path, default=config.EVALUATIONS_DIR, help="Directory where JSON/MD reports are written.")
    parser.add_argument("--fail-under", type=float, default=80.0, help="Fail if average score drops below this threshold.")
    parser.add_argument("--no-write-report", action="store_true", help="Skip writing report artifacts to disk.")
    args = parser.parse_args(argv)

    harness = EvaluationHarness(benchmarks_path=args.benchmarks, output_dir=args.output_dir)
    report = harness.run(write_artifacts=not args.no_write_report)

    output = json.dumps(report, indent=2, ensure_ascii=False)
    print(output)

    if report["summary"]["average_score"] < args.fail_under:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
