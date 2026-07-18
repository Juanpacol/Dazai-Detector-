import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ShapFeature } from "../types";

export function ShapBarChart({ explanation }: { explanation: ShapFeature[] }) {
  const sorted = [...explanation].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));
  const data = sorted.map((f) => ({ name: f.feature, impact: f.shap_value }));
  const summary = sorted
    .map((f) => `${f.feature} ${f.direction === "increases" ? "increases" : "decreases"} risk`)
    .join(", ");

  return (
    <div role="img" aria-label={`Feature impact chart: ${summary}`}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" horizontal={false} />
          <XAxis type="number" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={64}
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: "#131318", border: "1px solid #ffffff1a", borderRadius: 12 }}
            labelStyle={{ color: "#e2e8f0" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={(value: number) => [`${value > 0 ? "▲ increases" : "▼ decreases"} risk (${value.toFixed(3)})`, ""]}
          />
          <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.impact > 0 ? "#ef4444" : "#22c55e"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
