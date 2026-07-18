"""Model-quality metrics against ground truth — computed once per pipeline run.

Kept separate from run_pipeline.py so the metric math is independently testable
and reusable (e.g. from a notebook or a future retraining job).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from intelligence.pipeline import config


def _confusion(y_true, y_pred) -> dict:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "true_positive": int(tp),
        "false_positive": int(fp),
        "false_negative": int(fn),
        "true_negative": int(tn),
    }


def _threshold_sweep(y_true: np.ndarray, scores: np.ndarray) -> list[dict]:
    points = []
    for i in range(config.THRESHOLD_SWEEP_STEPS + 1):
        threshold = i / config.THRESHOLD_SWEEP_STEPS
        y_pred = (scores >= threshold).astype(int)
        points.append(
            {
                "threshold": round(threshold, 4),
                "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
                "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
                "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
            }
        )
    return points


def _amount_bucket_label(amount: float) -> str:
    for low, high, label in config.AMOUNT_BUCKETS:
        if low <= amount < high:
            return label
    return config.AMOUNT_BUCKETS[-1][2]


def _segment_breakdown(df: pd.DataFrame, group_col: str) -> dict[str, dict]:
    return {
        str(segment): _confusion(group[config.LABEL_COLUMN], group["_y_pred"])
        for segment, group in df.groupby(group_col)
    }


def _calibration_curve(y_true: np.ndarray, scores: np.ndarray) -> list[dict]:
    bins = config.CALIBRATION_BINS
    edges = np.linspace(0.0, 1.0, bins + 1)
    points = []
    for i in range(bins):
        lo, hi = edges[i], edges[i + 1]
        mask = (scores >= lo) & (scores <= hi if i == bins - 1 else scores < hi)
        count = int(mask.sum())
        if count == 0:
            continue
        points.append(
            {
                "bin_start": round(float(lo), 2),
                "bin_end": round(float(hi), 2),
                "count": count,
                "mean_predicted": round(float(scores[mask].mean()), 4),
                "observed_fraud_rate": round(float(y_true[mask].mean()), 4),
            }
        )
    return points


def compute(scored_df: pd.DataFrame, meta: dict) -> dict | None:
    """Compute model-quality metrics against the ground-truth label.

    Returns None when `scored_df` has no label column (e.g. scoring unlabeled
    production data with no way to check accuracy).
    """
    if config.LABEL_COLUMN not in scored_df.columns:
        return None

    y_true = scored_df[config.LABEL_COLUMN].to_numpy()
    scores = scored_df["risk_score"].to_numpy()
    y_pred = (scores >= config.ALERT_THRESHOLD).astype(int)

    df = scored_df.copy()
    df["_y_pred"] = y_pred
    df["_amount_bucket"] = df["Amount_raw"].apply(_amount_bucket_label)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pr_auc": round(float(average_precision_score(y_true, scores)), 4),
        "roc_auc": round(float(roc_auc_score(y_true, scores)), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        "brier_score": round(float(brier_score_loss(y_true, scores)), 4),
        "confusion_matrix": _confusion(y_true, y_pred),
        "threshold_sweep": _threshold_sweep(y_true, scores),
        "segments": {
            "by_tier": _segment_breakdown(df, "risk_tier"),
            "by_amount_bucket": _segment_breakdown(df, "_amount_bucket"),
        },
        "calibration_curve": _calibration_curve(y_true, scores),
        "meta": {
            **meta,
            "threshold": config.ALERT_THRESHOLD,
            "classifier_weight": config.CLASSIFIER_WEIGHT,
            "dbscan_weight": config.DBSCAN_WEIGHT,
            "risk_tiers": config.RISK_TIERS,
        },
    }


def write(metrics: dict) -> None:
    config.MODEL_METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(config.MODEL_METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
