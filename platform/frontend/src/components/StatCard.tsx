import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CountUp } from "./reactbits/CountUp";

interface ParsedValue {
  number: number;
  prefix: string;
  suffix: string;
  decimals: number;
}

function parseNumeric(value: string | number): ParsedValue | null {
  if (typeof value === "number") {
    return { number: value, prefix: "", suffix: "", decimals: Number.isInteger(value) ? 0 : 2 };
  }
  const match = value.match(/^([^\d]*)([\d,]*\.?\d+)([^\d]*)$/);
  if (!match) return null;
  const [, prefix, numStr, suffix] = match;
  const cleaned = numStr.replace(/,/g, "");
  if (!cleaned || Number.isNaN(Number(cleaned))) return null;
  const decimals = cleaned.includes(".") ? cleaned.split(".")[1].length : 0;
  return { number: Number(cleaned), prefix, suffix, decimals };
}

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
  const parsed = parseNumeric(value);

  return (
    <div className="card flex items-center gap-4 p-4 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-glow">
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
          {parsed ? (
            <CountUp
              value={parsed.number}
              decimals={parsed.decimals}
              prefix={parsed.prefix}
              suffix={parsed.suffix}
              className="mt-0.5 text-xl font-semibold tabular-nums text-white"
            />
          ) : (
            <p className="mt-0.5 text-xl font-semibold text-white">{value}</p>
          )}
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
