import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { RiskScoreBar } from "../components/RiskScoreBar";
import { ShapBarChart } from "../components/ShapBarChart";
import { TierBadge } from "../components/TierBadge";
import type { AlertDetail as AlertDetailType } from "../types";

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const [alert, setAlert] = useState<AlertDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<AlertDetailType>(`/alerts/${id}`)
      .then(setAlert)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-600">Failed to load alert: {error}</p>;
  if (!alert) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <Link to="/alerts" className="text-sm text-blue-600 hover:underline">
        &larr; Back to alerts
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{alert.id}</h1>
          <TierBadge tier={alert.risk_tier} />
        </div>
        <p className="mt-1 text-slate-500">{new Date(alert.timestamp).toLocaleString()}</p>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Amount</p>
            <p className="font-medium">${alert.amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Risk Score</p>
            <RiskScoreBar score={alert.risk_score} />
          </div>
          <div>
            <p className="text-slate-500">DBSCAN / Classifier</p>
            <p className="font-medium">
              {alert.dbscan_score.toFixed(2)} / {alert.classifier_score.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Why was this flagged?</h2>
        <p className="text-slate-700">{alert.narrative}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Feature Impact (SHAP)</h2>
        <ShapBarChart explanation={alert.shap_explanation} />
      </div>
    </div>
  );
}
