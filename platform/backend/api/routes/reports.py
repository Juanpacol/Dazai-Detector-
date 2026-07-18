from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from backend.repositories.report_repository import ReportRepository
from backend.schemas.models import Report, ReportSummary
from backend.services.report_service import generate_report

router = APIRouter(prefix="/reports", tags=["reports"])
_repository = ReportRepository()


@router.get("", response_model=list[ReportSummary])
def list_reports():
    summaries = []
    for report_id in _repository.list_ids():
        report = _repository.get_json(report_id)
        if report:
            summaries.append({"id": report_id, "generated_at": report["generated_at"]})
    return summaries


@router.get("/latest", response_model=Report)
def get_latest_report():
    report = _repository.latest_json()
    if report is None:
        raise HTTPException(status_code=404, detail="No reports have been generated yet")
    return report


@router.get("/latest/markdown", response_class=PlainTextResponse)
def get_latest_report_markdown():
    markdown = _repository.latest_markdown()
    if markdown is None:
        raise HTTPException(status_code=404, detail="No reports have been generated yet")
    return markdown


@router.get("/{report_id}", response_model=Report)
def get_report(report_id: str):
    report = _repository.get_json(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return report


@router.get("/{report_id}/markdown", response_class=PlainTextResponse)
def get_report_markdown(report_id: str):
    markdown = _repository.get_markdown(report_id)
    if markdown is None:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return markdown


@router.post("/generate", response_model=Report)
def generate_new_report():
    from datetime import datetime, timezone

    report = generate_report()
    report_id = f"report_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}"
    _repository.save(report_id, report.to_dict(), report.to_markdown())
    return report.to_dict()
