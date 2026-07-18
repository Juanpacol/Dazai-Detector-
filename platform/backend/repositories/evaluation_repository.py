"""Reads persisted chat/RAG evaluation reports written by the evaluation harness.

Repository pattern: the only place that reads data/outputs/evaluations/*.json.
"""

from __future__ import annotations

import json

from intelligence.pipeline import config


class EvaluationRepository:
    def latest(self) -> dict | None:
        if not config.EVALUATIONS_DIR.exists():
            return None
        files = sorted(config.EVALUATIONS_DIR.glob("eval_*.json"))
        if not files:
            return None
        return json.loads(files[-1].read_text())
