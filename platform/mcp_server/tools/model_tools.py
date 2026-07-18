"""Grounded, side-effect-free access to model_metrics.json.

Mirrors alert_tools.py: the single place that reads the metrics file, cached
in memory with an explicit `reload()` for after a pipeline re-run.
"""

from __future__ import annotations

import json

from intelligence.pipeline import config

_cache: dict | None = None
_loaded = False


def reload() -> dict | None:
    """Force a re-read from disk (call after re-running the pipeline)."""
    global _cache, _loaded
    if config.MODEL_METRICS_PATH.exists():
        with open(config.MODEL_METRICS_PATH) as f:
            _cache = json.load(f)
    else:
        _cache = None
    _loaded = True
    return _cache


def latest() -> dict | None:
    global _loaded
    if not _loaded:
        reload()
    return _cache
