import { CheckCircle2, Clock, History, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { AlertDetail, AuditEntry, CaseStatus, CaseVerdict } from "../types";
import { VerdictBadge } from "./VerdictBadge";

const STATUSES: CaseStatus[] = ["open", "investigating", "resolved"];

function describeAudit(entry: AuditEntry): string {
  switch (entry.action) {
    case "verdict_changed":
      return `Verdict changed: ${entry.from ?? "unreviewed"} → ${entry.to}`;
    case "status_changed":
      return `Status changed: ${entry.from} → ${entry.to}`;
    case "assignee_changed":
      return `Assignee changed: ${entry.from ?? "none"} → ${entry.to}`;
    case "note_added":
      return `Note added: "${entry.note}"`;
    default:
      return entry.action;
  }
}

export function CaseWorkflowCard({
  alert,
  onUpdate,
}: {
  alert: AlertDetail;
  onUpdate: (patch: Partial<AlertDetail>) => void;
}) {
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [noteText, setNoteText] = useState("");
  const [assignee, setAssignee] = useState(alert.assignee ?? "");
  const [busy, setBusy] = useState(false);

  const refreshAudit = () => {
    api.get<AuditEntry[]>(`/alerts/${alert.id}/audit`).then(setAudit).catch(() => setAudit([]));
  };

  useEffect(() => {
    refreshAudit();
    setAssignee(alert.assignee ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id]);

  const setVerdict = async (verdict: CaseVerdict) => {
    setBusy(true);
    try {
      const result = await api.patch<{ verdict: CaseVerdict }>(`/alerts/${alert.id}/verdict`, { verdict });
      onUpdate({ verdict: result.verdict });
      refreshAudit();
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: CaseStatus) => {
    setBusy(true);
    try {
      const result = await api.patch<{ status: CaseStatus }>(`/alerts/${alert.id}/status`, { status });
      onUpdate({ status: result.status });
      refreshAudit();
    } finally {
      setBusy(false);
    }
  };

  const saveAssignee = async () => {
    setBusy(true);
    try {
      await api.patch(`/alerts/${alert.id}/status`, { status: alert.status, assignee: assignee || null });
      onUpdate({ assignee: assignee || null });
      refreshAudit();
    } finally {
      setBusy(false);
    }
  };

  const submitNote = async () => {
    if (!noteText.trim()) return;
    setBusy(true);
    try {
      const result = await api.post<{ notes: AlertDetail["notes"] }>(`/alerts/${alert.id}/notes`, { text: noteText.trim() });
      onUpdate({ notes: result.notes });
      setNoteText("");
      refreshAudit();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-300">Case Workflow</h2>
        <VerdictBadge verdict={alert.verdict} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => setVerdict("confirmed_fraud")}
          className="flex items-center gap-1.5 rounded-lg bg-tier-critical/10 px-3 py-1.5 text-xs font-medium text-tier-critical ring-1 ring-inset ring-tier-critical/25 hover:bg-tier-critical/20 disabled:opacity-40"
        >
          <XCircle size={14} /> Confirm Fraud
        </button>
        <button
          disabled={busy}
          onClick={() => setVerdict("false_positive")}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/25 hover:bg-emerald-500/20 disabled:opacity-40"
        >
          <CheckCircle2 size={14} /> False Positive
        </button>
        {alert.verdict !== "unreviewed" && (
          <button
            disabled={busy}
            onClick={() => setVerdict("unreviewed")}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-400 ring-1 ring-inset ring-white/[0.06] hover:text-slate-200 disabled:opacity-40"
          >
            Reset
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-slate-500">
          Status
          <select
            value={alert.status}
            disabled={busy}
            onChange={(e) => setStatus(e.target.value as CaseStatus)}
            className="mt-1 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent-600/40"
            aria-label="Case status"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-ink-900">
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Assignee
          <div className="mt-1 flex gap-2">
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Unassigned"
              aria-label="Assignee"
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent-600/40"
            />
            <button
              disabled={busy}
              onClick={saveAssignee}
              className="shrink-0 rounded-lg px-3 py-2 text-xs text-slate-300 ring-1 ring-inset ring-white/[0.06] hover:text-white disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </label>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</h3>
        <div className="space-y-2">
          {alert.notes.map((note, i) => (
            <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs text-slate-400">
              <p>{note.text}</p>
              <p className="mt-1 text-slate-600">{new Date(note.timestamp).toLocaleString()}</p>
            </div>
          ))}
          {alert.notes.length === 0 && <p className="text-xs text-slate-600">No notes yet.</p>}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNote()}
            placeholder="Add an investigation note…"
            aria-label="Add note"
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent-600/40"
          />
          <button
            disabled={busy || !noteText.trim()}
            onClick={submitNote}
            className="shrink-0 rounded-lg bg-accent-600/20 px-3 py-2 text-xs font-medium text-accent-300 ring-1 ring-inset ring-accent-600/30 hover:bg-accent-600/30 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          <History size={12} /> Audit Trail
        </h3>
        <div className="space-y-2">
          {audit.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
              <Clock size={12} className="mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400">{describeAudit(entry)}</span>
                <span className="ml-2 text-slate-600">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {audit.length === 0 && <p className="text-xs text-slate-600">No actions recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
