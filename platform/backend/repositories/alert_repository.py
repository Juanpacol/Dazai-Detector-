"""Backend-facing view over alert data.

Repository pattern: the backend's services only ever go through this class,
never through `mcp_server.tools.alert_tools` directly — this is the seam that
would let the backend switch storage later without touching any route/service.
"""

from __future__ import annotations

from mcp_server.tools import alert_tools


class AlertRepository:
    def list(self, tier: str | None = None, limit: int | None = None) -> list[dict]:
        return alert_tools.list_alerts(tier=tier, limit=limit)

    def page(
        self,
        tier: str | None,
        min_score: float | None,
        offset: int,
        limit: int,
        date_from: str | None = None,
        date_to: str | None = None,
        amount_min: float | None = None,
        amount_max: float | None = None,
        search: str | None = None,
        sort_by: str = "risk_score",
        sort_dir: str = "desc",
    ) -> tuple[list[dict], int]:
        return alert_tools.page_alerts(
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

    def get(self, alert_id: str) -> dict | None:
        return alert_tools.get_alert(alert_id)

    def all(self) -> list[dict]:
        return alert_tools.all_alerts()
