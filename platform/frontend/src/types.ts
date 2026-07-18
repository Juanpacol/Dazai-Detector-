// Mirrors platform/backend/schemas/models.py — keep both in sync.

export type CaseStatus = "open" | "investigating" | "resolved";
export type CaseVerdict = "unreviewed" | "confirmed_fraud" | "false_positive";

export interface Alert {
  id: string;
  timestamp: string;
  amount: number;
  risk_score: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dbscan_score: number;
  classifier_score: number;
  status: CaseStatus;
  verdict: CaseVerdict;
  assignee: string | null;
}

export interface Note {
  text: string;
  timestamp: string;
}

export interface AuditEntry {
  timestamp: string;
  alert_id: string;
  action: string;
  from: string | number | null;
  to: string | number | null;
  note: string | null;
}

export interface ShapFeature {
  feature: string;
  value: number;
  shap_value: number;
  direction: "increases" | "decreases";
}

export interface SignalComponent {
  score: number;
  weight: number;
  contribution: number;
}

export interface SignalBreakdown {
  classifier: SignalComponent;
  dbscan: SignalComponent;
  risk_score: number;
}

export interface Citation {
  source: string;
  tool: string;
  reference: string;
  field?: string | null;
  value?: string | number | boolean | null;
  timestamp?: string | null;
  snippet?: string | null;
}

export interface ToolTrace {
  tool: string;
  action: string;
  details: Record<string, string | number | boolean>;
  status: string;
  latency_ms?: number | null;
}

export interface AlertDetail extends Alert {
  features: Record<string, number>;
  shap_explanation: ShapFeature[];
  narrative: string;
  signal_breakdown: SignalBreakdown;
  citations: Citation[];
  provenance: Record<string, string>;
  notes: Note[];
}

export interface AlertPage {
  items: Alert[];
  total: number;
  limit: number;
  offset: number;
}

export interface TierCalibration {
  total: number;
  reviewed: number;
  confirmed: number;
  observed_precision: number | null;
}

export interface StatsSummary {
  total_alerts: number;
  total_flagged_amount: number;
  tier_distribution: Record<string, number>;
  by_hour: Record<string, number>;
  by_amount_bucket: Record<string, number>;
  reviewed_count: number;
  confirmed_count: number;
  false_positive_count: number;
  review_rate: number;
  observed_precision: number | null;
  calibration_by_tier: Record<string, TierCalibration>;
}

export interface TrendsSummary {
  by_day: Record<string, Record<string, number>>;
  current_period_total: number;
  previous_period_total: number;
  total_delta_pct: number | null;
}

export interface ReportSummary {
  id: string;
  generated_at: string;
}

export interface TopAlert {
  id: string;
  amount: number;
  risk_score: number;
  risk_tier: string;
  narrative: string;
}

export interface Report {
  generated_at: string;
  tier_counts: Record<string, number>;
  total_flagged_amount: number;
  top_alerts: TopAlert[];
  patterns: {
    by_hour?: Record<string, number>;
    by_amount_bucket?: Record<string, number>;
  };
}

export interface ConfusionMatrix {
  true_positive: number;
  false_positive: number;
  false_negative: number;
  true_negative: number;
}

export interface ThresholdPoint {
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface CalibrationPoint {
  bin_start: number;
  bin_end: number;
  count: number;
  mean_predicted: number;
  observed_fraud_rate: number;
}

export interface FeatureDrift {
  psi: number;
  ks_statistic: number;
  ks_pvalue: number;
}

export interface DriftSummary {
  status: "ok" | "warning" | "alert";
  max_psi: number;
  drifted_features: string[];
  features: Record<string, FeatureDrift>;
}

export interface ModelMetrics {
  generated_at: string;
  pr_auc: number;
  roc_auc: number;
  precision: number;
  recall: number;
  f1: number;
  brier_score: number;
  confusion_matrix: ConfusionMatrix;
  threshold_sweep: ThresholdPoint[];
  segments: {
    by_tier: Record<string, ConfusionMatrix>;
    by_amount_bucket: Record<string, ConfusionMatrix>;
  };
  calibration_curve: CalibrationPoint[];
  drift: DriftSummary;
  meta: {
    train_rows: number;
    score_rows: number;
    classifier_artifact: string;
    threshold: number;
    classifier_weight: number;
    dbscan_weight: number;
    risk_tiers: Record<string, number>;
  };
}

export interface EvaluationSummary {
  cases: number;
  average_score: number;
  pass_rate: number;
  intent_accuracy: number;
  citation_coverage: number;
  groundedness: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
}

export interface QualityGate {
  passed: boolean;
  threshold: number;
  reason: string;
}

export interface EvaluationReport {
  generated_at: string;
  summary: EvaluationSummary;
  quality_gate: QualityGate;
}

export interface ChatResponse {
  answer: string;
  intent: string;
  agent: string;
  sources: string[];
  citations: Citation[];
  confidence: number;
  tool_trace: ToolTrace[];
  latency_ms: number;
  verified: boolean;
  ok: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  intent?: string;
  agent?: string;
  ok?: boolean;
  failed?: boolean;
  citations?: Citation[];
  confidence?: number;
  tool_trace?: ToolTrace[];
  latency_ms?: number;
  verified?: boolean;
  streaming?: boolean;
  progress?: string[];
}
