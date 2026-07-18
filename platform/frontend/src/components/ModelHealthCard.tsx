import { Activity, Crosshair, Gauge, Target } from "lucide-react";

import type { ModelMetrics } from "../types";
import { ConfusionMatrixCard } from "./ConfusionMatrixCard";
import { DriftBadge } from "./DriftBadge";
import { SpotlightCard } from "./reactbits/SpotlightCard";
import { StatCard } from "./StatCard";
import { ThresholdCurveChart } from "./ThresholdCurveChart";

function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function ModelHealthCard({ metrics }: { metrics: ModelMetrics }) {
  return (
    <SpotlightCard className="card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-300">Model Health</h2>
        <div className="flex items-center gap-3">
          <DriftBadge drift={metrics.drift} />
          <p className="text-xs text-slate-500">
            Evaluated on {metrics.meta.score_rows.toLocaleString()} held-out transactions · updated{" "}
            {new Date(metrics.generated_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Precision" value={toPercent(metrics.precision)} icon={Target} />
        <StatCard label="Recall" value={toPercent(metrics.recall)} icon={Crosshair} />
        <StatCard label="PR-AUC" value={metrics.pr_auc.toFixed(3)} icon={Gauge} />
        <StatCard label="F1 Score" value={metrics.f1.toFixed(3)} icon={Activity} />
      </div>
      <p className="text-xs text-slate-500">
        Of alerts raised at the current threshold ({metrics.meta.threshold.toFixed(2)}), {toPercent(metrics.precision)} were
        real fraud (precision), catching {toPercent(metrics.recall)} of all fraud in the evaluated set (recall).
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Confusion Matrix</h3>
          <ConfusionMatrixCard matrix={metrics.confusion_matrix} />
        </div>
        <div>
          <h3 id="chart-threshold" className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Precision / Recall vs Threshold
          </h3>
          <div role="img" aria-labelledby="chart-threshold">
            <ThresholdCurveChart points={metrics.threshold_sweep} currentThreshold={metrics.meta.threshold} />
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
