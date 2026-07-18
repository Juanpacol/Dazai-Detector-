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


class AlertDetail(Alert):
    features: dict[str, float]
    shap_explanation: list[ShapFeature]
    narrative: str
    signal_breakdown: SignalBreakdown
    citations: list[Citation] = Field(default_factory=list)
    provenance: dict[str, str] = Field(default_factory=dict)


class AlertPage(BaseModel):
    items: list[Alert]
    total: int
    limit: int
    offset: int


class StatsSummary(BaseModel):
    total_alerts: int
    total_flagged_amount: float
    tier_distribution: dict[str, int]
    by_hour: dict[str, int]
    by_amount_bucket: dict[str, int]


class TopAlert(BaseModel):
    id: str
    amount: float
    risk_score: float
    risk_tier: str
    narrative: str


class Report(BaseModel):
    generated_at: str
    tier_counts: dict[str, int]
    total_flagged_amount: float
    top_alerts: list[TopAlert]
    patterns: dict


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
