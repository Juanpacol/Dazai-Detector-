import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "../api/client";
import type { StatsSummary } from "../types";

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<StatsSummary>("/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">Failed to load stats: {error}</p>;
  if (!stats) return <p className="text-slate-500">Loading...</p>;

  const hourData = Object.entries(stats.by_hour).map(([hour, count]) => ({ hour, count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Alerts" value={stats.total_alerts} />
        <KpiCard label="Flagged Amount" value={`$${stats.total_flagged_amount.toLocaleString()}`} />
        {["HIGH", "CRITICAL"].map((tier) => (
          <KpiCard key={tier} label={`${tier} Tier`} value={stats.tier_distribution[tier] ?? 0} />
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Alerts by Hour</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={hourData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
