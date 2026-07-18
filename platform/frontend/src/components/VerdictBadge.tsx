import { motion } from "motion/react";

import type { CaseVerdict } from "../types";

const VERDICT_STYLES: Record<CaseVerdict, string> = {
  unreviewed: "bg-white/5 text-slate-400 ring-white/10",
  confirmed_fraud: "bg-tier-critical/10 text-tier-critical ring-tier-critical/25",
  false_positive: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
};

const VERDICT_LABELS: Record<CaseVerdict, string> = {
  unreviewed: "Unreviewed",
  confirmed_fraud: "Confirmed Fraud",
  false_positive: "False Positive",
};

export function VerdictBadge({ verdict }: { verdict: CaseVerdict }) {
  return (
    <motion.span
      key={verdict}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`pill ${VERDICT_STYLES[verdict]}`}
      role="status"
      aria-label={`Verdict: ${VERDICT_LABELS[verdict]}`}
    >
      {VERDICT_LABELS[verdict]}
    </motion.span>
  );
}
