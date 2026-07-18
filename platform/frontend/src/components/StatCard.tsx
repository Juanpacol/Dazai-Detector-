import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  deltaPct,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "critical";
  deltaPct?: number | null;
}) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          tone === "critical" ? "bg-tier-critical/10 text-tier-critical" : "bg-accent-600/10 text-accent-400"
        }`}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <div className="flex items-center gap-2">
          <p className="mt-0.5 text-xl font-semibold text-white">{value}</p>
          {deltaPct != null && (
            <span
              className={`flex items-center gap-0.5 text-xs font-medium ${
                deltaPct > 0 ? "text-tier-critical" : deltaPct < 0 ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {deltaPct > 0 ? <TrendingUp size={12} /> : deltaPct < 0 ? <TrendingDown size={12} /> : null}
              {Math.abs(deltaPct).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
