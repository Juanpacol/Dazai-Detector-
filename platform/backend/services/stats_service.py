"""Backs the dashboard KPIs — thin wrapper over the shared stats tools.

Feedback-derived accuracy stats live here (not in mcp_server.tools.stats_tools)
because they join alert data with backend-owned case-workflow state.
"""

from __future__ import annotations

from backend.repositories.case_repository import CaseRepository
from mcp_server.tools import alert_tools, stats_tools


class StatsService:
    def __init__(self):
        self._case_repository = CaseRepository()

    def summary(self) -> dict:
        base = stats_tools.summary()
        feedback = self._feedback_summary(base["total_alerts"])
        return {
            **base,
            "by_hour": stats_tools.alerts_by_hour(),
            "by_amount_bucket": stats_tools.alerts_by_amount_bucket(),
            **feedback,
        }

    def _feedback_summary(self, total_alerts: int) -> dict:
        cases = self._case_repository.all_cases()
        reviewed = [c for c in cases.values() if c["verdict"] != "unreviewed"]
        confirmed = sum(1 for c in reviewed if c["verdict"] == "confirmed_fraud")
        false_positive = sum(1 for c in reviewed if c["verdict"] == "false_positive")
        return {
            "reviewed_count": len(reviewed),
            "confirmed_count": confirmed,
            "false_positive_count": false_positive,
            "review_rate": round(len(reviewed) / total_alerts * 100, 1) if total_alerts else 0.0,
            "observed_precision": round(confirmed / len(reviewed) * 100, 1) if reviewed else None,
            "calibration_by_tier": self._calibration_by_tier(cases),
        }

    def trends(self) -> dict:
        by_day = stats_tools.alerts_by_day()
        days = sorted(by_day.keys())

        def total_for(day_list: list[str]) -> int:
            return sum(sum(by_day[d].values()) for d in day_list)

        if len(days) < 2:
            return {
                "by_day": by_day,
                "current_period_total": total_for(days),
                "previous_period_total": 0,
                "total_delta_pct": None,
            }

        mid = len(days) // 2
        previous_days, current_days = days[:mid], days[mid:]
        current_total = total_for(current_days)
        previous_total = total_for(previous_days)
        delta_pct = round((current_total - previous_total) / previous_total * 100, 1) if previous_total else None

        return {
            "by_day": by_day,
            "current_period_total": current_total,
            "previous_period_total": previous_total,
            "total_delta_pct": delta_pct,
        }

    def _calibration_by_tier(self, cases: dict[str, dict]) -> dict[str, dict]:
        breakdown: dict[str, dict] = {}
        for alert in alert_tools.all_alerts():
            tier = alert["risk_tier"]
            bucket = breakdown.setdefault(tier, {"total": 0, "reviewed": 0, "confirmed": 0})
            bucket["total"] += 1
            case = cases.get(alert["id"])
            if case and case["verdict"] != "unreviewed":
                bucket["reviewed"] += 1
                if case["verdict"] == "confirmed_fraud":
                    bucket["confirmed"] += 1
        for bucket in breakdown.values():
            bucket["observed_precision"] = (
                round(bucket["confirmed"] / bucket["reviewed"] * 100, 1) if bucket["reviewed"] else None
            )
        return breakdown
