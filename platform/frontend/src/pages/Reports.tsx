import { FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import type { Report, ReportSummary } from "../types";

export default function Reports() {
  const [history, setHistory] = useState<ReportSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadHistory = () => {
    api
      .get<ReportSummary[]>("/reports")
      .then((summaries) => {
        setHistory(summaries);
        if (summaries.length > 0) {
          setSelectedId((current) => current ?? summaries[0].id);
        }
      })
      .catch(() => setHistory([]));
  };

  const loadMarkdown = (id: string | null) => {
    const path = id ? `/reports/${id}/markdown` : "/reports/latest/markdown";
    api
      .getText(path)
      .then(setMarkdown)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (selectedId) loadMarkdown(selectedId);
  }, [selectedId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.post<Report>("/reports/generate", {});
      loadHistory();
      setSelectedId(null);
      loadMarkdown(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-white">High-Risk Reports</h1>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label="Report history"
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent-600/40"
            >
              {history.map((r) => (
                <option key={r.id} value={r.id} className="bg-ink-900">
                  {new Date(r.generated_at).toLocaleString()}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-glow transition-opacity hover:bg-accent-500 disabled:opacity-50"
          >
            <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
            {generating ? "Generating..." : "Generate now"}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <div className="card p-6">
        {markdown ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-400">{markdown}</pre>
        ) : (
          <EmptyState icon={FileText} message='No report yet — click "Generate now".' />
        )}
      </div>
    </div>
  );
}
