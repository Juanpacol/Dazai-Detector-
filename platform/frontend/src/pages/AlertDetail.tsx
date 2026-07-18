import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { CaseWorkflowCard } from "../components/CaseWorkflowCard";
import { ErrorState } from "../components/ErrorState";
import { RiskScoreBar } from "../components/RiskScoreBar";
import { ShapBarChart } from "../components/ShapBarChart";
import { SignalBreakdown } from "../components/SignalBreakdown";
import { CardSkeleton } from "../components/Skeleton";
import { TierBadge } from "../components/TierBadge";
import type { AlertDetail as AlertDetailType, StatsSummary, TierCalibration } from "../types";

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const [alert, setAlert] = useState<AlertDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tierCalibration, setTierCalibration] = useState<TierCalibration | null>(null);

  const load = () => {
    if (!id) return;
    setError(null);
    api
      .get<AlertDetailType>(`/alerts/${id}`)
      .then(setAlert)
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  useEffect(() => {
    if (!alert) return;
    api
      .get<StatsSummary>("/stats")
      .then((stats) => setTierCalibration(stats.calibration_by_tier[alert.risk_tier] ?? null))
      .catch(() => setTierCalibration(null));
  }, [alert?.risk_tier]);

  if (error) return <ErrorState message={`Failed to load alert: ${error}`} onRetry={load} />;
  if (!alert) return <CardSkeleton lines={5} />;

  return (
    <div className="space-y-6">
      <Link to="/alerts" className="flex w-fit items-center gap-1 text-sm text-accent-400 hover:underline">
        <ArrowLeft size={14} /> Back to alerts
      </Link>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">{alert.id}</h1>
          <TierBadge tier={alert.risk_tier} />
        </div>
        <p className="mt-1 text-sm text-slate-500">{new Date(alert.timestamp).toLocaleString()}</p>

        <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Amount</p>
            <p className="font-medium text-slate-200">${alert.amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Risk Score</p>
            <RiskScoreBar score={alert.risk_score} />
            {tierCalibration && tierCalibration.reviewed > 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                {alert.risk_tier} alerts have been confirmed fraud in {tierCalibration.observed_precision?.toFixed(0)}%
                of {tierCalibration.reviewed} reviewed cases.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-600">
                No {alert.risk_tier.toLowerCase()}-tier alerts reviewed yet to confirm real-world accuracy.
              </p>
            )}
          </div>
          <div>
            <p className="text-slate-500">DBSCAN / Classifier</p>
            <p className="font-medium text-slate-200">
              {alert.dbscan_score.toFixed(2)} / {alert.classifier_score.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-2 text-sm font-medium text-slate-300">Why was this flagged?</h2>
        <p className="text-sm leading-relaxed text-slate-400">{alert.narrative}</p>
        {alert.provenance?.source && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="pill bg-white/[0.03] text-slate-400 ring-white/[0.06]">source: {alert.provenance.source}</span>
            {alert.provenance.retrieved_at && (
              <span className="pill bg-white/[0.03] text-slate-400 ring-white/[0.06]">
                retrieved: {new Date(alert.provenance.retrieved_at).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      <CaseWorkflowCard
        alert={alert}
        onUpdate={(patch) => setAlert((prev) => (prev ? { ...prev, ...patch } : prev))}
      />

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-300">How the risk score was composed</h2>
        <SignalBreakdown breakdown={alert.signal_breakdown} />
      </div>

      <div className="card p-6">
        <h2 className="mb-2 text-sm font-medium text-slate-300">Feature Impact (SHAP)</h2>
        <ShapBarChart explanation={alert.shap_explanation} />
      </div>

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-medium text-slate-300">Evidence</h2>
        <div className="grid gap-2">
          {alert.citations.map((citation, index) => (
            <div
              key={`${citation.tool}-${citation.reference}-${index}`}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-slate-400"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill bg-accent-600/10 text-accent-300 ring-accent-600/20">{citation.source}</span>
                <span className="font-medium text-slate-200">{citation.tool}</span>
                <span className="text-slate-500">{citation.reference}</span>
                {citation.field && <span className="text-slate-500">{citation.field}</span>}
                {citation.value !== undefined && <span className="text-slate-500">value: {String(citation.value)}</span>}
              </div>
              {citation.snippet && <p className="mt-1 text-slate-500">{citation.snippet}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
