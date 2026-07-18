"""Grounded, side-effect-free access to alerts.json.

This is the single place that reads the alerts file. Every agent and every
backend route that needs alert data goes through these functions — never
through a direct file open elsewhere.
"""

from __future__ import annotations

import json

from intelligence.pipeline import config
from mcp_server.tools.evidence import citation, now_iso

_cache: list[dict] | None = None


def _load() -> list[dict]:
    global _cache
    if _cache is None:
        reload()
    return _cache


def reload() -> list[dict]:
    """Force a re-read from disk (call after re-running the pipeline)."""
    global _cache
    if config.ALERTS_PATH.exists():
        with open(config.ALERTS_PATH) as f:
            _cache = json.load(f)
    else:
        _cache = []
    return _cache


def _load_narratives() -> dict[str, str]:
    if config.NARRATIVES_PATH.exists():
        with open(config.NARRATIVES_PATH) as f:
            return json.load(f)
    return {}


def _filtered(tier: str | None, min_score: float | None) -> list[dict]:
    alerts = _load()
    if tier:
        alerts = [a for a in alerts if a["risk_tier"] == tier.upper()]
    if min_score is not None:
        alerts = [a for a in alerts if a["risk_score"] >= min_score]
    return sorted(alerts, key=lambda a: a["risk_score"], reverse=True)


def list_alerts(tier: str | None = None, limit: int | None = 20) -> list[dict]:
    alerts = _filtered(tier, None)
    return alerts[:limit] if limit else alerts


def page_alerts(
    tier: str | None, min_score: float | None, offset: int, limit: int
) -> tuple[list[dict], int]:
    alerts = _filtered(tier, min_score)
    return alerts[offset : offset + limit], len(alerts)


def get_alert(alert_id: str) -> dict | None:
    return next((a for a in _load() if a["id"] == alert_id), None)


def all_alerts() -> list[dict]:
    return _load()


def get_provenance(alert_id: str) -> dict:
    alert = get_alert(alert_id)
    return {
        "alert_id": alert_id,
        "source": str(config.ALERTS_PATH),
        "retrieved_at": now_iso(),
        "record_timestamp": alert["timestamp"] if alert else None,
        "artifact": "alerts.json",
    }


def get_citations(alert_id: str) -> list[dict]:
    alert = get_alert(alert_id)
    if not alert:
        return []
    citations = [
        citation(source="alert", tool="alert_tools.get_alert", reference=alert_id, field="amount", value=alert["amount"]),
        citation(source="alert", tool="alert_tools.get_alert", reference=alert_id, field="risk_score", value=alert["risk_score"]),
        citation(source="alert", tool="alert_tools.get_alert", reference=alert_id, field="risk_tier", value=alert["risk_tier"]),
    ]
    for feature in alert.get("shap_explanation", [])[:3]:
        citations.append(
            citation(
                source="shap",
                tool="alert_tools.get_alert",
                reference=alert_id,
                field=feature["feature"],
                value=feature["shap_value"],
                snippet=f"{feature['feature']}={feature['value']:.4f} {feature['direction']}",
            )
        )
    return citations


def explain_risk_score(alert_id: str) -> dict | None:
    alert = get_alert(alert_id)
    if not alert:
        return None
    return {
        "alert_id": alert_id,
        "risk_score": alert["risk_score"],
        "classifier": {
            "score": alert["classifier_score"],
            "weight": config.CLASSIFIER_WEIGHT,
            "contribution": round(config.CLASSIFIER_WEIGHT * alert["classifier_score"], 4),
        },
        "dbscan": {
            "score": alert["dbscan_score"],
            "weight": config.DBSCAN_WEIGHT,
            "contribution": round(config.DBSCAN_WEIGHT * alert["dbscan_score"], 4),
        },
        "citations": get_citations(alert_id),
        "provenance": get_provenance(alert_id),
    }


def get_alert_context(alert_id: str) -> dict | None:
    alert = get_alert(alert_id)
    if not alert:
        return None
    narratives = _load_narratives()
    narrative = narratives.get(alert_id, "")
    return {
        "alert": alert,
        "narrative": narrative,
        "signal_breakdown": explain_risk_score(alert_id),
        "citations": get_citations(alert_id),
        "provenance": get_provenance(alert_id),
    }
