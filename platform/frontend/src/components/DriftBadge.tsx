import { AlertTriangle, CheckCircle2, TriangleAlert } from "lucide-react";

import type { DriftSummary } from "../types";

const STYLES: Record<DriftSummary["status"], string> = {
  ok: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
  warning: "bg-tier-medium/10 text-tier-medium ring-tier-medium/25",
  alert: "bg-tier-critical/10 text-tier-critical ring-tier-critical/25",
};

const ICONS = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  alert: TriangleAlert,
};

const LABELS: Record<DriftSummary["status"], string> = {
  ok: "No drift detected",
  warning: "Moderate drift",
  alert: "Significant drift",
};

export function DriftBadge({ drift }: { drift: DriftSummary }) {
  const Icon = ICONS[drift.status];
  return (
    <span
      className={`pill flex items-center gap-1 ${STYLES[drift.status]}`}
      role="status"
      aria-label={`Feature drift: ${LABELS[drift.status]}, max PSI ${drift.max_psi}`}
    >
      <Icon size={12} />
      {LABELS[drift.status]} (PSI {drift.max_psi.toFixed(3)})
    </span>
  );
}
