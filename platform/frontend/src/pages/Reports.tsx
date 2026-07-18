import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { Report } from "../types";

export default function Reports() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    api
      .getText("/reports/latest/markdown")
      .then(setMarkdown)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.post<Report>("/reports/generate", {});
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Latest High-Risk Report</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate now"}
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {markdown ? (
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{markdown}</pre>
        ) : (
          <p className="text-slate-500">No report yet — click "Generate now".</p>
        )}
      </div>
    </div>
  );
}
