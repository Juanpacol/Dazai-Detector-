"""Analyst case-workflow actions: verdicts, status, notes, audit trail."""

from __future__ import annotations

from fastapi import HTTPException

from backend.repositories.case_repository import CaseRepository
from intelligence.pipeline import config


class CaseService:
    def __init__(self):
        self._repository = CaseRepository()

    def set_verdict(self, alert_id: str, verdict: str) -> dict:
        if verdict not in config.CASE_VERDICTS:
            raise HTTPException(status_code=422, detail=f"verdict must be one of {config.CASE_VERDICTS}")
        return self._repository.set_verdict(alert_id, verdict)

    def set_status(self, alert_id: str, status: str, assignee: str | None) -> dict:
        if status not in config.CASE_STATUSES:
            raise HTTPException(status_code=422, detail=f"status must be one of {config.CASE_STATUSES}")
        return self._repository.set_status(alert_id, status, assignee)

    def add_note(self, alert_id: str, text: str) -> dict:
        return self._repository.add_note(alert_id, text)

    def get(self, alert_id: str) -> dict:
        return self._repository.get(alert_id)

    def audit_for(self, alert_id: str) -> list[dict]:
        return self._repository.audit_for(alert_id)

    def audit_page(self, offset: int, limit: int) -> dict:
        items, total = self._repository.audit_page(offset, limit)
        return {"items": items, "total": total, "limit": limit, "offset": offset}

    def all_cases(self) -> dict[str, dict]:
        return self._repository.all_cases()
