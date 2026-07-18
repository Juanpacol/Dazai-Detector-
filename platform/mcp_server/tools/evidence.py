"""Structured evidence helpers for citations, provenance, and tool traces."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def citation(
    *,
    source: str,
    tool: str,
    reference: str,
    field: str | None = None,
    value: Any | None = None,
    timestamp: str | None = None,
    snippet: str | None = None,
) -> dict:
    return {
        "source": source,
        "tool": tool,
        "reference": reference,
        "field": field,
        "value": value,
        "timestamp": timestamp,
        "snippet": snippet,
    }


def tool_trace(
    *,
    tool: str,
    action: str,
    details: dict[str, Any] | None = None,
    status: str = "ok",
    latency_ms: int | None = None,
) -> dict:
    return {
        "tool": tool,
        "action": action,
        "details": details or {},
        "status": status,
        "latency_ms": latency_ms,
    }

