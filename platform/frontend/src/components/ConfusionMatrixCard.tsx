import type { ConfusionMatrix } from "../types";

const CELLS: { key: keyof ConfusionMatrix; label: string; tone: string }[] = [
  { key: "true_positive", label: "True Positive", tone: "text-tier-critical" },
  { key: "false_negative", label: "False Negative", tone: "text-amber-400" },
  { key: "false_positive", label: "False Positive", tone: "text-amber-400" },
  { key: "true_negative", label: "True Negative", tone: "text-emerald-400" },
];

export function ConfusionMatrixCard({ matrix }: { matrix: ConfusionMatrix }) {
  return (
    <div className="grid grid-cols-2 gap-3" role="table" aria-label="Confusion matrix">
      {CELLS.map(({ key, label, tone }) => (
        <div key={key} className="rounded-xl border border-white/5 bg-white/[0.02] p-3" role="row">
          <p className="text-xs text-slate-500" role="rowheader">
            {label}
          </p>
          <p className={`mt-1 text-lg font-semibold ${tone}`}>{matrix[key].toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
