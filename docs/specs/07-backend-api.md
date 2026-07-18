# Spec 07 — Backend API

## Goal

Expose everything built so far as a REST API the frontend (and any other client) can consume.

## Scope

- `platform/backend/schemas/` — Pydantic models: `Alert`, `AlertDetail` (adds `shap_explanation` +
  `narrative`), `Report`, `ChatRequest`/`ChatResponse`, `StatsSummary`.
- `platform/backend/repositories/`
  - `AlertRepository` (**Repository pattern**): loads `alerts.json` once (cached in memory), exposes
    `.list(tier=None, limit=None)`, `.get(alert_id)`. Single place that touches the file.
  - `ReportRepository`: reused from spec 04.
- `platform/backend/services/`
  - `alert_service.py`: thin orchestration over `AlertRepository` + `NarrativeService` (lazy-generates
    and caches narrative on first detail view).
  - `report_service.py`: reused from spec 04, exposed via service layer.
  - `chat_service.py`: reused from spec 06 (`IntentRouter`).
- `platform/backend/api/routes/`
  - `alerts.py`: `GET /api/alerts`, `GET /api/alerts/{id}`.
  - `stats.py`: `GET /api/stats` (tier distribution, totals, time patterns — backs the dashboard KPIs).
  - `reports.py`: `GET /api/reports/latest`, `GET /api/reports/latest/markdown`, `POST
    /api/reports/generate`.
  - `chat.py`: `POST /api/chat` — `{question: str} -> {answer: str, intent: str, sources: [...]}`.
- `platform/backend/main.py` — FastAPI app, CORS enabled for the Vite dev origin, mounts all routers
  under `/api`, root health check at `/`. Runnable directly with `python platform/backend/main.py`
  (calls `uvicorn.run(...)` in `if __name__ == "__main__"`) so no dotted module path is required.

## Contract

- All routes return the Pydantic schemas above — the frontend never parses a raw dict shape that isn't
  documented here.
- `ChatResponse.sources` lists which tool(s)/alert ID(s) grounded the answer, so the frontend can show
  "based on: Alert #4231" next to the chat answer (visual proof of no hallucination — good for the demo).

## Acceptance criteria

- `python platform/backend/main.py` starts the server cleanly.
- Every route in `docs/specs/07-backend-api.md` responds with the documented schema against the
  artifacts produced by specs 01–06.
- `POST /api/chat` answers all 4 predefined question types with a non-empty `sources` list.
