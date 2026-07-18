"""Feature-distribution drift between the training split and the scoring batch.

A static model silently degrades as the input distribution shifts away from
what it was trained on — this runs once per pipeline execution so that drift
shows up on the dashboard before precision/recall visibly drop.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

from intelligence.pipeline import config

PSI_BINS = 10
PSI_WARNING_THRESHOLD = 0.1
PSI_ALERT_THRESHOLD = 0.25


def _psi(train: np.ndarray, score: np.ndarray, bins: int = PSI_BINS) -> float:
    """Population Stability Index: <0.1 stable, 0.1-0.25 moderate, >0.25 significant shift."""
    edges = np.unique(np.quantile(train, np.linspace(0, 1, bins + 1)))
    if len(edges) < 3:
        return 0.0

    train_counts, _ = np.histogram(train, bins=edges)
    score_counts, _ = np.histogram(score, bins=edges)
    train_pct = np.clip(train_counts / len(train), 1e-6, None)
    score_pct = np.clip(score_counts / len(score), 1e-6, None)
    return float(np.sum((score_pct - train_pct) * np.log(score_pct / train_pct)))


def compute(train_df: pd.DataFrame, score_df: pd.DataFrame) -> dict:
    features = {}
    for col in config.FEATURE_COLUMNS:
        train_values = train_df[col].to_numpy()
        score_values = score_df[col].to_numpy()
        ks_stat, ks_pvalue = ks_2samp(train_values, score_values)
        features[col] = {
            "psi": round(_psi(train_values, score_values), 4),
            "ks_statistic": round(float(ks_stat), 4),
            "ks_pvalue": round(float(ks_pvalue), 4),
        }

    max_psi = max((f["psi"] for f in features.values()), default=0.0)
    drifted = sorted(
        (col for col, f in features.items() if f["psi"] >= PSI_WARNING_THRESHOLD),
        key=lambda col: features[col]["psi"],
        reverse=True,
    )
    status = (
        "alert" if max_psi >= PSI_ALERT_THRESHOLD else "warning" if max_psi >= PSI_WARNING_THRESHOLD else "ok"
    )

    return {
        "status": status,
        "max_psi": round(max_psi, 4),
        "drifted_features": drifted,
        "features": features,
    }
