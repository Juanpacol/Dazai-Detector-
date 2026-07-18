from fastapi import APIRouter, HTTPException

from backend.schemas.models import AlertDetail
from backend.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])
_service = AlertService()


@router.get("", response_model=list[dict])
def list_alerts(tier: str | None = None, limit: int | None = 50):
    return _service.list(tier=tier, limit=limit)


@router.get("/{alert_id}", response_model=AlertDetail)
def get_alert(alert_id: str):
    alert = _service.get_detail(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return alert
