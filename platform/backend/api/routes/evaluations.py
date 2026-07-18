from fastapi import APIRouter, HTTPException

from backend.repositories.evaluation_repository import EvaluationRepository
from backend.schemas.models import EvaluationReport

router = APIRouter(prefix="/evaluations", tags=["evaluations"])
_repository = EvaluationRepository()


@router.get("/latest", response_model=EvaluationReport)
def get_latest_evaluation():
    report = _repository.latest()
    if report is None:
        raise HTTPException(status_code=404, detail="No evaluation reports available yet.")
    return report
