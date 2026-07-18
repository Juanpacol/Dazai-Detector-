from fastapi import APIRouter, Query

from backend.schemas.models import AuditPage
from backend.services.case_service import CaseService

router = APIRouter(prefix="/audit", tags=["audit"])
_service = CaseService()


@router.get("", response_model=AuditPage)
def list_audit(offset: int = Query(default=0, ge=0), limit: int = Query(default=50, ge=1, le=200)):
    return _service.audit_page(offset=offset, limit=limit)
