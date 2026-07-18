import { AlertTriangle, CheckCircle2, DollarSign, LineChart as LineChartIcon, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "../api/client";
import { AssistantQualityCard } from "../components/AssistantQualityCard";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ModelHealthCard } from "../components/ModelHealthCard";
import { AnimatedContent } from "../components/reactbits/AnimatedContent";
import { FadeContent } from "../components/reactbits/FadeContent";
import { SpotlightCard } from "../components/reactbits/SpotlightCard";
import { CardSkeleton } from "../components/Skeleton";
import { StatCard } from "../components/StatCard";
import { TierTrendChart } from "../components/TierTrendChart";
import type { EvaluationReport, ModelMetrics, StatsSummary, TrendsSummary } from "../types";

const tooltipStyle = {
  contentStyle: { background: "#131318", border: "1px solid #ffffff1a", borderRadius: 12 },
  labelStyle: { color: "#e2e8f0" },
  itemStyle: { color: "#e2e8f0" },
};

export default function Dashboard() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [modelMetricsAvailable, setModelMetricsAvailable] = useState(true);
  const [evaluation, setEvaluation] = useState<EvaluationReport | null>(null);
  const [evaluationAvailable, setEvaluationAvailable] = useState(true);
  const [trends, setTrends] = useState<TrendsSummary | null>(null);

  const loadStats = () => {
    setError(null);
    api
      .get<StatsSummary>("/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadStats();
    api
      .get<ModelMetrics>("/model/metrics")
      .then(setModelMetrics)
      .catch(() => setModelMetricsAvailable(false));
    api
      .get<EvaluationReport>("/evaluations/latest")
      .then(setEvaluation)
      .catch(() => setEvaluationAvailable(false));
    api.get<TrendsSummary>("/stats/trends").then(setTrends).catch(() => setTrends(null));
  }, []);

  if (error) return <ErrorState message={`Failed to load dashboard stats: ${error}`} onRetry={loadStats} />;
  if (!stats)
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} lines={1} />
          ))}
        </div>
        <CardSkeleton lines={4} />
      </div>
    );

  const hourData = Object.entries(stats.by_hour).map(([hour, count]) => ({ hour, count }));
  const bucketData = Object.entries(stats.by_amount_bucket).map(([bucket, count]) => ({ bucket, count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Alerts" value={stats.total_alerts} icon={ShieldAlert} deltaPct={trends?.total_delta_pct} />
        <StatCard
          label="Flagged Amount"
          value={`$${stats.total_flagged_amount.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard label="Critical Tier" value={stats.tier_distribution.CRITICAL ?? 0} icon={AlertTriangle} tone="critical" />
        <StatCard label="High Tier" value={stats.tier_distribution.HIGH ?? 0} icon={ShieldCheck} />
      </div>

      <AnimatedContent direction="up" delay={0}>
        <SpotlightCard className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">Analyst Feedback</h2>
            <p className="text-xs text-slate-500">
              {stats.reviewed_count} of {stats.total_alerts} alerts reviewed ({stats.review_rate.toFixed(1)}%)
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Observed Precision"
              value={stats.observed_precision !== null ? `${stats.observed_precision.toFixed(1)}%` : "—"}
              icon={CheckCircle2}
            />
            <StatCard label="Confirmed Fraud" value={stats.confirmed_count} icon={CheckCircle2} />
            <StatCard label="False Positives" value={stats.false_positive_count} icon={XCircle} />
            <StatCard label="Review Rate" value={`${stats.review_rate.toFixed(1)}%`} icon={ShieldCheck} />
          </div>
          {stats.observed_precision === null && (
            <p className="mt-3 text-xs text-slate-500">
              No alerts reviewed yet — confirm or dismiss alerts on their detail page to start measuring real-world
              precision.
            </p>
          )}
        </SpotlightCard>
      </AnimatedContent>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnimatedContent direction="up" delay={0.05}>
          <SpotlightCard className="card p-5">
            <h2 id="chart-hour" className="mb-4 text-sm font-medium text-slate-300">
              Alerts by Hour
            </h2>
            <div role="img" aria-labelledby="chart-hour">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={hourData}>
                  <defs>
                    <linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" vertical={false} />
                  <XAxis dataKey="hour" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#hourFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SpotlightCard>
        </AnimatedContent>

        <AnimatedContent direction="up" delay={0.1}>
          <SpotlightCard className="card p-5">
            <h2 id="chart-bucket" className="mb-4 text-sm font-medium text-slate-300">
              Alerts by Amount Bucket
            </h2>
            <div role="img" aria-labelledby="chart-bucket">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bucketData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" vertical={false} />
                  <XAxis dataKey="bucket" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SpotlightCard>
        </AnimatedContent>
      </div>

      {trends && Object.keys(trends.by_day).length > 0 && (
        <AnimatedContent direction="up" delay={0.15}>
          <SpotlightCard className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="chart-trend" className="text-sm font-medium text-slate-300">
                Alerts by Tier Over Time
              </h2>
              {trends.total_delta_pct !== null && (
                <p className="text-xs text-slate-500">
                  {trends.current_period_total} in latest period vs {trends.previous_period_total} previous (
                  {trends.total_delta_pct > 0 ? "+" : ""}
                  {trends.total_delta_pct.toFixed(1)}%)
                </p>
              )}
            </div>
            <div role="img" aria-labelledby="chart-trend">
              <TierTrendChart trends={trends} />
            </div>
          </SpotlightCard>
        </AnimatedContent>
      )}

      {modelMetrics && modelMetrics.drift.status !== "ok" && (
        <div
          className={`card flex items-center gap-3 p-4 text-sm ${
            modelMetrics.drift.status === "alert" ? "text-tier-critical animate-pulse-glow" : "text-tier-medium"
          }`}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <p>
            Feature drift detected ({modelMetrics.drift.status}, max PSI {modelMetrics.drift.max_psi.toFixed(3)}) in:{" "}
            {modelMetrics.drift.drifted_features.join(", ")}. Model accuracy on new data may no longer match the
            metrics below — consider retraining.
          </p>
        </div>
      )}

      {modelMetrics ? (
        <FadeContent>
          <ModelHealthCard metrics={modelMetrics} />
        </FadeContent>
      ) : !modelMetricsAvailable ? (
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-medium text-slate-300">Model Health</h2>
          <EmptyState icon={LineChartIcon} message="No model metrics yet — run the scoring pipeline to compute precision, recall and calibration." />
        </div>
      ) : null}

      {evaluation ? (
        <FadeContent>
          <AssistantQualityCard report={evaluation} />
        </FadeContent>
      ) : !evaluationAvailable ? (
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-medium text-slate-300">Assistant Quality</h2>
          <EmptyState icon={LineChartIcon} message="No evaluation reports yet — run the chat evaluation harness to see quality metrics here." />
        </div>
      ) : null}
    </div>
  );
}
