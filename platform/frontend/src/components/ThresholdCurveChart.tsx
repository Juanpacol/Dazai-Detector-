import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ThresholdPoint } from "../types";

export function ThresholdCurveChart({ points, currentThreshold }: { points: ThresholdPoint[]; currentThreshold: number }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={points} margin={{ left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" vertical={false} />
        <XAxis
          dataKey="threshold"
          stroke="#64748b"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          tickFormatter={(v: number) => v.toFixed(1)}
        />
        <YAxis domain={[0, 1]} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#131318", border: "1px solid #ffffff1a", borderRadius: 12 }}
          labelStyle={{ color: "#e2e8f0" }}
          itemStyle={{ color: "#e2e8f0" }}
          labelFormatter={(v: number) => `Threshold ${v.toFixed(2)}`}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <ReferenceLine x={currentThreshold} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "current", fill: "#f59e0b", fontSize: 11 }} />
        <Line type="monotone" dataKey="precision" name="Precision" stroke="#8b5cf6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="recall" name="Recall" stroke="#22c55e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
