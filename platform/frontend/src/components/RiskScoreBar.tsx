export function RiskScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.9 ? "bg-red-600" : score >= 0.75 ? "bg-orange-500" : score >= 0.5 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm tabular-nums text-slate-600">{pct}%</span>
    </div>
  );
}
