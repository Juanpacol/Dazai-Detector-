"""Analyst case-workflow state: verdicts, status, assignee, notes, audit trail.

Repository pattern: the only place that reads/writes case_state.json and
audit_log.jsonl. Writes are atomic (temp file + os.replace) since this is the
first backend component that mutates data rather than just reading it.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from intelligence.pipeline import config
from mcp_server.tools.evidence import now_iso


def _default_case() -> dict:
    return {
        "status": config.DEFAULT_CASE_STATUS,
        "verdict": config.DEFAULT_CASE_VERDICT,
        "assignee": None,
        "notes": [],
        "updated_at": None,
    }


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(content)
        os.replace(tmp_path, path)
    except BaseException:
        Path(tmp_path).unlink(missing_ok=True)
        raise


class CaseRepository:
    def __init__(self):
        config.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    def _load_all(self) -> dict[str, dict]:
        if not config.CASE_STATE_PATH.exists():
            return {}
        with open(config.CASE_STATE_PATH) as f:
            return json.load(f)

    def _save_all(self, cases: dict[str, dict]) -> None:
        _atomic_write(config.CASE_STATE_PATH, json.dumps(cases, indent=2))

    def _append_audit(self, alert_id: str, action: str, from_value, to_value, note: str | None = None) -> None:
        entry = {
            "timestamp": now_iso(),
            "alert_id": alert_id,
            "action": action,
            "from": from_value,
            "to": to_value,
            "note": note,
        }
        config.AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(config.AUDIT_LOG_PATH, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def get(self, alert_id: str) -> dict:
        return self._load_all().get(alert_id, _default_case())

    def all_cases(self) -> dict[str, dict]:
        return self._load_all()

    def set_verdict(self, alert_id: str, verdict: str) -> dict:
        cases = self._load_all()
        case = cases.get(alert_id, _default_case())
        previous = case["verdict"]
        case["verdict"] = verdict
        case["updated_at"] = now_iso()
        cases[alert_id] = case
        self._save_all(cases)
        self._append_audit(alert_id, "verdict_changed", previous, verdict)
        return case

    def set_status(self, alert_id: str, status: str, assignee: str | None = None) -> dict:
        cases = self._load_all()
        case = cases.get(alert_id, _default_case())
        previous_status = case["status"]
        previous_assignee = case["assignee"]

        case["status"] = status
        if assignee is not None:
            case["assignee"] = assignee
        case["updated_at"] = now_iso()
        cases[alert_id] = case
        self._save_all(cases)

        if previous_status != status:
            self._append_audit(alert_id, "status_changed", previous_status, status)
        if assignee is not None and previous_assignee != assignee:
            self._append_audit(alert_id, "assignee_changed", previous_assignee, assignee)
        return case

    def add_note(self, alert_id: str, note: str) -> dict:
        cases = self._load_all()
        case = cases.get(alert_id, _default_case())
        entry = {"text": note, "timestamp": now_iso()}
        case["notes"] = [*case["notes"], entry]
        case["updated_at"] = now_iso()
        cases[alert_id] = case
        self._save_all(cases)
        self._append_audit(alert_id, "note_added", None, note, note=note)
        return case

    def _read_audit_log(self) -> list[dict]:
        if not config.AUDIT_LOG_PATH.exists():
            return []
        entries = []
        with open(config.AUDIT_LOG_PATH) as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))
        return entries

    def audit_for(self, alert_id: str) -> list[dict]:
        return [e for e in self._read_audit_log() if e["alert_id"] == alert_id]

    def audit_page(self, offset: int, limit: int) -> tuple[list[dict], int]:
        entries = list(reversed(self._read_audit_log()))
        return entries[offset : offset + limit], len(entries)
