"""Backward-compatible script wrapper for the evaluation harness.

Run with:
    python platform/backend/services/eval_service.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_PLATFORM_DIR = _PROJECT_ROOT / "platform"
for _p in (_PROJECT_ROOT, _PLATFORM_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from backend.evaluation.cli import main


if __name__ == "__main__":
    raise SystemExit(main())
