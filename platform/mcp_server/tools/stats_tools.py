"""Aggregate statistics over alerts — the single implementation used by both
the automatic report builder and the pattern-analysis chat agent.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime

from intelligence.pipeline import config
from mcp_server.tools import alert_tools
from mcp_server.tools.evidence import citation


def tier_distribution() -> dict[str, int]:
    alerts = alert_tools.all_alerts()
    return dict(Counter(a["risk_tier"] for a in alerts))


def alerts_by_hour() -> dict[str, int]:
    alerts = alert_tools.all_alerts()
    counts: Counter[str] = Counter()
    for a in alerts:
        hour = datetime.fromisoformat(a["timestamp"]).strftime("%H:00")
        counts[hour] += 1
    return dict(sorted(counts.items()))


def alerts_by_day() -> dict[str, dict[str, int]]:
    """Tier counts per day, keyed by ISO date, for trend charts."""
    by_day: dict[str, Counter[str]] = {}
    for a in alert_tools.all_alerts():
        day = a["timestamp"][:10]
        by_day.setdefault(day, Counter())[a["risk_tier"]] += 1
    return {day: dict(counts) for day, counts in sorted(by_day.items())}


def alerts_by_amount_bucket() -> dict[str, int]:
    counts = {label: 0 for *_range, label in config.AMOUNT_BUCKETS}
    for a in alert_tools.all_alerts():
        amount = a["amount"]
        for low, high, label in config.AMOUNT_BUCKETS:
            if low <= amount < high:
                counts[label] += 1
                break
    return counts


def summary() -> dict:
    alerts = alert_tools.all_alerts()
    total_amount = sum(a["amount"] for a in alerts)
    return {
        "total_alerts": len(alerts),
        "total_flagged_amount": round(total_amount, 2),
        "tier_distribution": tier_distribution(),
    }


def dashboard_summary() -> dict:
    base = summary()
    return {
        **base,
        "by_hour": alerts_by_hour(),
        "by_amount_bucket": alerts_by_amount_bucket(),
        "citations": [
            citation(source="stats", tool="stats_tools.summary", reference="dashboard", field="total_alerts", value=base["total_alerts"]),
            citation(source="stats", tool="stats_tools.summary", reference="dashboard", field="total_flagged_amount", value=base["total_flagged_amount"]),
        ],
    }
