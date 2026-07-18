"""Grounded access to generated reports."""

from __future__ import annotations

from backend.repositories.report_repository import ReportRepository
from intelligence.pipeline import config
from mcp_server.tools.evidence import citation, now_iso


def get_latest_report() -> dict | None:
    repo = ReportRepository()
    report_id = repo.latest_id()
    if not report_id:
        return None

    report_json = repo.get_json(report_id) or {}
    markdown = repo.get_markdown(report_id) or ""
    citations = [
        citation(
            source="report",
            tool="report_tools.get_latest_report",
            reference=report_id,
            field="generated_at",
            value=report_json.get("generated_at"),
        ),
        citation(
            source="report",
            tool="report_tools.get_latest_report",
            reference=report_id,
            field="total_flagged_amount",
            value=report_json.get("total_flagged_amount"),
        ),
    ]
    return {
        "report_id": report_id,
        "report": report_json,
        "markdown": markdown,
        "citations": citations,
        "provenance": {
            "source": str(config.REPORTS_DIR),
            "retrieved_at": now_iso(),
            "artifact": f"{report_id}.json",
        },
    }

