"""Orchestrates alert retrieval and lazy narrative generation."""

from __future__ import annotations

from backend.repositories.alert_repository import AlertRepository
from backend.services.narrative_service import NarrativeService

_narrative_cache: dict[str, str] = {}


class AlertService:
    def __init__(self):
        self._repository = AlertRepository()
        self._narrative_service = NarrativeService()

    def list(self, tier: str | None = None, limit: int | None = None) -> list[dict]:
        return self._repository.list(tier=tier, limit=limit)

    def get_detail(self, alert_id: str) -> dict | None:
        alert = self._repository.get(alert_id)
        if alert is None:
            return None

        if alert_id not in _narrative_cache:
            _narrative_cache[alert_id] = self._narrative_service.narrate(alert)

        return {**alert, "narrative": _narrative_cache[alert_id]}
