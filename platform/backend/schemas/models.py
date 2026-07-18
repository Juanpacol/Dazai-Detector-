"""Pydantic schemas — every route response is one of these, nothing else."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ShapFeature(BaseModel):
    feature: str
    value: float
    shap_value: float
    direction: str


class Alert(BaseModel):
    id: str
    timestamp: str
    amount: float
    risk_score: float
    risk_tier: str
    dbscan_score: float
    classifier_score: float
    status: str = "open"
    verdict: str = "unreviewed"
    assignee: str | None = None


class SignalComponent(BaseModel):
    score: float
    weight: float
    contribution: float


class SignalBreakdown(BaseModel):
    classifier: SignalComponent
    dbscan: SignalComponent
    risk_score: float


class Citation(BaseModel):
    source: str
    tool: str
    reference: str
    field: str | None = None
    value: str | float | int | bool | None = None
    timestamp: str | None = None
    snippet: str | None = None


class ToolTrace(BaseModel):
    tool: str
    action: str
    details: dict[str, str | int | float | bool] = Field(default_factory=dict)
    status: str = "ok"
    latency_ms: int | None = None


class Note(BaseModel):
    text: str
    timestamp: str


class AlertDetail(Alert):
    features: dict[str, float]
    shap_explanation: list[ShapFeature]
    narrative: str
    signal_breakdown: SignalBreakdown
    citations: list[Citation] = Field(default_factory=list)
    provenance: dict[str, str] = Field(default_factory=dict)
    notes: list[Note] = Field(default_factory=list)


class VerdictRequest(BaseModel):
    verdict: str


class StatusRequest(BaseModel):
    status: str
    assignee: str | None = None


class NoteRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class AuditEntry(BaseModel):
    timestamp: str
    alert_id: str
    action: str
    from_: str | int | None = Field(default=None, alias="from")
    to: str | int | None = None
    note: str | None = None

    model_config = {"populate_by_name": True}


class AuditPage(BaseModel):
    items: list[AuditEntry]
    total: int
    limit: int
    offset: int


class AlertPage(BaseModel):
    items: list[Alert]
    total: int
    limit: int
    offset: int


class TierCalibration(BaseModel):
    total: int
    reviewed: int
    confirmed: int
    observed_precision: float | None = None


class StatsSummary(BaseModel):
    total_alerts: int
    total_flagged_amount: float
    tier_distribution: dict[str, int]
    by_hour: dict[str, int]
    by_amount_bucket: dict[str, int]
    reviewed_count: int = 0
    confirmed_count: int = 0
    false_positive_count: int = 0
    review_rate: float = 0.0
    observed_precision: float | None = None
    calibration_by_tier: dict[str, TierCalibration] = Field(default_factory=dict)


class TrendsSummary(BaseModel):
    by_day: dict[str, dict[str, int]]
    current_period_total: int
    previous_period_total: int
    total_delta_pct: float | None = None


class TopAlert(BaseModel):
    id: str
    amount: float
    risk_score: float
    risk_tier: str
    narrative: str


class ReportSummary(BaseModel):
    id: str
    generated_at: str


class Report(BaseModel):
    generated_at: str
    tier_counts: dict[str, int]
    total_flagged_amount: float
    top_alerts: list[TopAlert]
    patterns: dict


class ConfusionMatrix(BaseModel):
    true_positive: int
    false_positive: int
    false_negative: int
    true_negative: int


class ThresholdPoint(BaseModel):
    threshold: float
    precision: float
    recall: float
    f1: float


class CalibrationPoint(BaseModel):
    bin_start: float
    bin_end: float
    count: int
    mean_predicted: float
    observed_fraud_rate: float


class FeatureDrift(BaseModel):
    psi: float
    ks_statistic: float
    ks_pvalue: float


class DriftSummary(BaseModel):
    status: str
    max_psi: float
    drifted_features: list[str]
    features: dict[str, FeatureDrift]


class ModelMetrics(BaseModel):
    generated_at: str
    pr_auc: float
    roc_auc: float
    precision: float
    recall: float
    f1: float
    brier_score: float
    confusion_matrix: ConfusionMatrix
    threshold_sweep: list[ThresholdPoint]
    segments: dict[str, dict[str, ConfusionMatrix]]
    calibration_curve: list[CalibrationPoint]
    drift: DriftSummary
    meta: dict


class EvaluationSummary(BaseModel):
    cases: int
    average_score: float
    pass_rate: float
    intent_accuracy: float
    citation_coverage: float
    groundedness: float
    avg_latency_ms: float
    p95_latency_ms: float


class QualityGate(BaseModel):
    passed: bool
    threshold: float
    reason: str


class EvaluationReport(BaseModel):
    generated_at: str
    summary: EvaluationSummary
    quality_gate: QualityGate


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class ChatResponse(BaseModel):
    answer: str
    intent: str
    agent: str
    sources: list[str]
    citations: list[Citation] = Field(default_factory=list)
    confidence: float = 0.0
    tool_trace: list[ToolTrace] = Field(default_factory=list)
    latency_ms: int = 0
    verified: bool = False
    ok: bool = True
