export function RiskScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.9
      ? "bg-tier-critical"
      : score >= 0.75
        ? "bg-tier-high"
        : score >= 0.5
          ? "bg-tier-medium"
          : "bg-tier-low";

  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Risk score ${pct}%`}>
      <div className="h-1.5 w-24 rounded-full bg-white/[0.06]" aria-hidden="true">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm tabular-nums text-slate-400" aria-hidden="true">
        {pct}%
      </span>
    </div>
  );
}
