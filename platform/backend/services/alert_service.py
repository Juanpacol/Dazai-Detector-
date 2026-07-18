"""Orchestrates alert retrieval, lazy narrative generation, and signal breakdown."""

from __future__ import annotations

from backend.repositories.alert_repository import AlertRepository
from backend.repositories.case_repository import CaseRepository
from backend.repositories.narrative_repository import NarrativeRepository
from backend.services.narrative_service import NarrativeService
from intelligence.pipeline import config
from mcp_server.tools import alert_tools


def _signal_breakdown(alert: dict) -> dict:
    classifier_contribution = config.CLASSIFIER_WEIGHT * alert["classifier_score"]
    dbscan_contribution = config.DBSCAN_WEIGHT * alert["dbscan_score"]
    return {
        "classifier": {
            "score": alert["classifier_score"],
            "weight": config.CLASSIFIER_WEIGHT,
            "contribution": round(classifier_contribution, 4),
        },
        "dbscan": {
            "score": alert["dbscan_score"],
            "weight": config.DBSCAN_WEIGHT,
            "contribution": round(dbscan_contribution, 4),
        },
        "risk_score": alert["risk_score"],
    }


class AlertService:
    def __init__(self):
        self._repository = AlertRepository()
        self._case_repository = CaseRepository()
        self._narrative_repository = NarrativeRepository()
        self._narrative_service = NarrativeService()

    def _with_case_state(self, alert: dict) -> dict:
        case = self._case_repository.get(alert["id"])
        return {
            **alert,
            "status": case["status"],
            "verdict": case["verdict"],
            "assignee": case["assignee"],
        }

    def exists(self, alert_id: str) -> bool:
        return self._repository.get(alert_id) is not None

    def list(self, tier: str | None = None, limit: int | None = None) -> list[dict]:
        return [self._with_case_state(a) for a in self._repository.list(tier=tier, limit=limit)]

    def page(
        self,
        tier: str | None,
        min_score: float | None,
        offset: int,
        limit: int,
        date_from: str | None = None,
        date_to: str | None = None,
        amount_min: float | None = None,
        amount_max: float | None = None,
        search: str | None = None,
        sort_by: str = "risk_score",
        sort_dir: str = "desc",
    ) -> dict:
        items, total = self._repository.page(
            tier=tier,
            min_score=min_score,
            offset=offset,
            limit=limit,
            date_from=date_from,
            date_to=date_to,
            amount_min=amount_min,
            amount_max=amount_max,
            search=search,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
        return {"items": [self._with_case_state(a) for a in items], "total": total, "limit": limit, "offset": offset}

    def all_filtered(
        self,
        tier: str | None,
        min_score: float | None,
        date_from: str | None,
        date_to: str | None,
        amount_min: float | None,
        amount_max: float | None,
        search: str | None,
        sort_by: str,
        sort_dir: str,
    ) -> list[dict]:
        items, _ = self._repository.page(
            tier=tier,
            min_score=min_score,
            offset=0,
            limit=10_000_000,
            date_from=date_from,
            date_to=date_to,
            amount_min=amount_min,
            amount_max=amount_max,
            search=search,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
        return [self._with_case_state(a) for a in items]

    def get_detail(self, alert_id: str) -> dict | None:
        context = alert_tools.get_alert_context(alert_id)
        if context is None:
            return None

        alert = context["alert"]
        narrative = context.get("narrative") or self._narrative_repository.get(alert_id)
        if not narrative:
            narrative = self._narrative_service.narrate(alert)
            self._narrative_repository.set(alert_id, narrative)

        case = self._case_repository.get(alert_id)
        return {
            **alert,
            "status": case["status"],
            "verdict": case["verdict"],
            "assignee": case["assignee"],
            "notes": case["notes"],
            "narrative": narrative,
            "signal_breakdown": _signal_breakdown(alert),
            "citations": context.get("citations", []),
            "provenance": context.get("provenance", {}),
        }
