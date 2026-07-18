"""End-to-end CLI: preprocess -> fit hybrid model -> score -> explain -> emit alerts.json.

Run with: python intelligence/pipeline/run_pipeline.py
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import joblib

from intelligence.pipeline import config, drift, metrics
from intelligence.pipeline.explainer import ShapExplainer
from intelligence.pipeline.hybrid import HybridFraudDetector
from intelligence.pipeline.preprocessing import Preprocessor

_DEMO_EPOCH = datetime(2024, 1, 1, tzinfo=timezone.utc)


def _to_timestamp(time_offset_seconds: float) -> str:
    return (_DEMO_EPOCH + timedelta(seconds=float(time_offset_seconds))).isoformat()


def _build_alert(row, explanation: list[dict]) -> dict:
    return {
        "id": f"TXN-{int(row.name):06d}",
        "timestamp": _to_timestamp(row["Time_raw"]),
        "amount": round(float(row["Amount_raw"]), 2),
        "risk_score": round(float(row["risk_score"]), 4),
        "risk_tier": row["risk_tier"],
        "dbscan_score": round(float(row["dbscan_score"]), 4),
        "classifier_score": round(float(row["classifier_score"]), 4),
        "features": {col: float(row[col]) for col in config.FEATURE_COLUMNS},
        "shap_explanation": explanation,
        "label": int(row[config.LABEL_COLUMN]) if config.LABEL_COLUMN in row else None,
    }


def main() -> None:
    preprocessor = Preprocessor()
    train_df, score_df = preprocessor.prepare()

    print(f"Train rows: {len(train_df)} | Score rows: {len(score_df)}")

    model = HybridFraudDetector().fit(train_df)

    config.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model.classifier.model, config.CLASSIFIER_PATH)

    scored_df = model.score(score_df)

    model_metrics = metrics.compute(
        scored_df,
        meta={
            "train_rows": len(train_df),
            "score_rows": len(score_df),
            "classifier_artifact": config.CLASSIFIER_PATH.name,
        },
    )
    if model_metrics is not None:
        model_metrics["drift"] = drift.compute(train_df, score_df)
        metrics.write(model_metrics)
        print(
            f"PR-AUC: {model_metrics['pr_auc']:.4f} | "
            f"Precision@{config.ALERT_THRESHOLD}: {model_metrics['precision']:.4f} | "
            f"Recall: {model_metrics['recall']:.4f}"
        )
        print(f"Drift status: {model_metrics['drift']['status']} (max PSI {model_metrics['drift']['max_psi']:.4f})")
        print(f"Wrote model metrics to {config.MODEL_METRICS_PATH}")

    alerted_df = scored_df[scored_df["risk_score"] >= config.ALERT_THRESHOLD].copy()
    print(f"Alerts above threshold {config.ALERT_THRESHOLD}: {len(alerted_df)}")

    explainer = ShapExplainer(model.classifier.model)
    explanations = explainer.explain(alerted_df[config.FEATURE_COLUMNS])

    alerts = [
        _build_alert(row, explanations[i])
        for i, (_, row) in enumerate(alerted_df.iterrows())
    ]

    config.ALERTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(config.ALERTS_PATH, "w") as f:
        json.dump(alerts, f, indent=2)

    print(f"Wrote {len(alerts)} alerts to {config.ALERTS_PATH}")


if __name__ == "__main__":
    main()
