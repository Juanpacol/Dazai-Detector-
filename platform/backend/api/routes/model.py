from fastapi import APIRouter, HTTPException

from backend.schemas.models import ModelMetrics
from backend.services.model_service import ModelService

router = APIRouter(prefix="/model", tags=["model"])
_service = ModelService()


@router.get("/metrics", response_model=ModelMetrics)
def get_model_metrics():
    metrics = _service.latest_metrics()
    if metrics is None:
        raise HTTPException(status_code=404, detail="No model metrics available yet — run the pipeline first.")
    return metrics
