import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ShapFeature } from "../types";

export function ShapBarChart({ explanation }: { explanation: ShapFeature[] }) {
  const data = [...explanation]
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .map((f) => ({ name: f.feature, impact: f.shap_value }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={60} />
        <Tooltip />
        <Bar dataKey="impact">
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.impact > 0 ? "#dc2626" : "#16a34a"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
