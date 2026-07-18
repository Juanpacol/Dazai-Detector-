import csv
import io
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from backend.schemas.models import (
    AlertDetail,
    AlertPage,
    AuditEntry,
    NoteRequest,
    StatusRequest,
    VerdictRequest,
)
from backend.services.alert_service import AlertService
from backend.services.case_service import CaseService
from intelligence.pipeline import config

router = APIRouter(prefix="/alerts", tags=["alerts"])
_service = AlertService()
_cases = CaseService()

RiskTier = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
SortBy = Literal["risk_score", "amount", "timestamp"]
SortDir = Literal["asc", "desc"]

CSV_COLUMNS = ["id", "timestamp", "amount", "risk_score", "risk_tier", "status", "verdict", "assignee"]


@router.get("", response_model=AlertPage)
def list_alerts(
    tier: RiskTier | None = None,
    min_score: float | None = Query(default=None, ge=0.0, le=1.0),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=config.ALERTS_DEFAULT_LIMIT, ge=1, le=config.ALERTS_MAX_LIMIT),
    date_from: str | None = None,
    date_to: str | None = None,
    amount_min: float | None = Query(default=None, ge=0.0),
    amount_max: float | None = Query(default=None, ge=0.0),
    search: str | None = None,
    sort_by: SortBy = "risk_score",
    sort_dir: SortDir = "desc",
):
    return _service.page(
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


@router.get("/export.csv")
def export_alerts_csv(
    tier: RiskTier | None = None,
    min_score: float | None = Query(default=None, ge=0.0, le=1.0),
    date_from: str | None = None,
    date_to: str | None = None,
    amount_min: float | None = Query(default=None, ge=0.0),
    amount_max: float | None = Query(default=None, ge=0.0),
    search: str | None = None,
    sort_by: SortBy = "risk_score",
    sort_dir: SortDir = "desc",
):
    alerts = _service.all_filtered(
        tier=tier,
        min_score=min_score,
        date_from=date_from,
        date_to=date_to,
        amount_min=amount_min,
        amount_max=amount_max,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(alerts)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=alerts_export.csv"},
    )


@router.get("/{alert_id}", response_model=AlertDetail)
def get_alert(alert_id: str):
    alert = _service.get_detail(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return alert


def _require_alert(alert_id: str) -> None:
    if not _service.exists(alert_id):
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")


@router.patch("/{alert_id}/verdict")
def set_verdict(alert_id: str, body: VerdictRequest):
    _require_alert(alert_id)
    return _cases.set_verdict(alert_id, body.verdict)


@router.patch("/{alert_id}/status")
def set_status(alert_id: str, body: StatusRequest):
    _require_alert(alert_id)
    return _cases.set_status(alert_id, body.status, body.assignee)


@router.post("/{alert_id}/notes")
def add_note(alert_id: str, body: NoteRequest):
    _require_alert(alert_id)
    return _cases.add_note(alert_id, body.text)


@router.get("/{alert_id}/audit", response_model=list[AuditEntry])
def get_alert_audit(alert_id: str):
    _require_alert(alert_id)
    return _cases.audit_for(alert_id)
