import { CheckCircle2, XCircle } from "lucide-react";

import { SpotlightCard } from "./reactbits/SpotlightCard";
import { StatCard } from "./StatCard";
import type { EvaluationReport } from "../types";

export function AssistantQualityCard({ report }: { report: EvaluationReport }) {
  const { summary, quality_gate: gate } = report;
  return (
    <SpotlightCard className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Assistant Quality</h2>
        <span className={`flex items-center gap-1 text-xs font-medium ${gate.passed ? "text-emerald-400" : "text-tier-critical"}`}>
          {gate.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {gate.passed ? "Quality gate passed" : "Quality gate failed"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Pass Rate" value={`${summary.pass_rate.toFixed(0)}%`} icon={CheckCircle2} />
        <StatCard label="Intent Accuracy" value={`${summary.intent_accuracy.toFixed(0)}%`} icon={CheckCircle2} />
        <StatCard label="Groundedness" value={`${summary.groundedness.toFixed(0)}%`} icon={CheckCircle2} />
        <StatCard label="P95 Latency" value={`${summary.p95_latency_ms.toFixed(0)} ms`} icon={CheckCircle2} />
      </div>
      <p className="text-xs text-slate-500">
        Based on {summary.cases} benchmark cases · {gate.reason}
      </p>
    </SpotlightCard>
  );
}
