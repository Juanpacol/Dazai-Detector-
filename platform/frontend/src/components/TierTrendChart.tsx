import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TrendsSummary } from "../types";

const TIER_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const TIERS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function TierTrendChart({ trends }: { trends: TrendsSummary }) {
  const data = Object.entries(trends.by_day).map(([day, counts]) => ({
    day,
    LOW: counts.LOW ?? 0,
    MEDIUM: counts.MEDIUM ?? 0,
    HIGH: counts.HIGH ?? 0,
    CRITICAL: counts.CRITICAL ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" vertical={false} />
        <XAxis dataKey="day" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis allowDecimals={false} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#131318", border: "1px solid #ffffff1a", borderRadius: 12 }}
          labelStyle={{ color: "#e2e8f0" }}
          itemStyle={{ color: "#e2e8f0" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        {TIERS.map((tier) => (
          <Bar key={tier} dataKey={tier} stackId="tier" fill={TIER_COLORS[tier]} radius={tier === "CRITICAL" ? [4, 4, 0, 0] : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
