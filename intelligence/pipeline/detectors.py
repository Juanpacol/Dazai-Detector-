"""Anomaly detection strategies.

Both detectors share the same `AnomalyDetector` interface (Strategy pattern) so
`HybridFraudDetector` can fuse their scores without knowing how each one works
internally.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors
from xgboost import XGBClassifier

from intelligence.pipeline import config


class AnomalyDetector(ABC):
    """Common interface for any fraud signal source."""

    @abstractmethod
    def fit(self, X: pd.DataFrame, y: pd.Series | None = None) -> "AnomalyDetector":
        ...

    @abstractmethod
    def score(self, X: pd.DataFrame) -> np.ndarray:
        """Return a fraud-likelihood score per row, in [0, 1]."""
        ...


class DBSCANDetector(AnomalyDetector):
    """Flags density outliers as likely fraud.

    DBSCAN has no `predict` for unseen points, so it is refit on every scoring
    batch: this is a batch anomaly signal, not an online classifier.

    `eps` is derived per-batch from the k-distance elbow (k=min_samples) instead
    of a fixed constant. A static eps tuned for one feature scale silently stops
    meaning anything the moment the data's dimensionality or scaling changes —
    on this dataset's ~30 standardized features a fixed eps of 1.5 flagged 100%
    of points as noise, making the "unsupervised" half of the hybrid score a
    constant. Deriving eps from the actual neighbor-distance distribution keeps
    it meaningful regardless of feature count or scale.
    """

    def __init__(
        self,
        min_samples: int = config.DBSCAN_MIN_SAMPLES,
        eps_percentile: float = config.DBSCAN_EPS_PERCENTILE,
    ):
        self.min_samples = min_samples
        self.eps_percentile = eps_percentile

    def fit(self, X: pd.DataFrame, y: pd.Series | None = None) -> "DBSCANDetector":
        # No persistent state to fit — DBSCAN is refit per batch in `score`.
        return self

    def _elbow_eps(self, values: np.ndarray) -> float:
        distances, _ = NearestNeighbors(n_neighbors=self.min_samples).fit(values).kneighbors(values)
        return float(np.percentile(distances[:, -1], self.eps_percentile))

    def score(self, X: pd.DataFrame) -> np.ndarray:
        values = X.values
        eps = self._elbow_eps(values)
        labels = DBSCAN(eps=eps, min_samples=self.min_samples).fit_predict(values)
        return np.where(labels == -1, 1.0, 0.0)


class SupervisedDetector(AnomalyDetector):
    """XGBoost classifier trained on labeled fraud examples.

    Scores come from an isotonic-calibrated ensemble so `risk_score` approximates
    a true fraud probability rather than XGBoost's raw (often overconfident)
    output. SHAP needs a single tree booster to explain, so a plain (uncalibrated)
    model is fit alongside purely for `.model` / explainability — calibration
    only reshapes the probability curve, not which features drive it.
    """

    def __init__(self):
        self._raw_model: XGBClassifier | None = None
        self._calibrated_model: CalibratedClassifierCV | None = None

    def fit(self, X: pd.DataFrame, y: pd.Series | None = None) -> "SupervisedDetector":
        if y is None:
            raise ValueError("SupervisedDetector.fit requires labels")

        positive = int(y.sum())
        negative = int(len(y) - positive)
        scale_pos_weight = (negative / positive) if positive else 1.0

        params = dict(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.1,
            scale_pos_weight=scale_pos_weight,
            eval_metric="aucpr",
            random_state=config.RANDOM_STATE,
        )

        self._raw_model = XGBClassifier(**params)
        self._raw_model.fit(X, y)

        self._calibrated_model = CalibratedClassifierCV(XGBClassifier(**params), method="isotonic", cv=3)
        self._calibrated_model.fit(X, y)
        return self

    def score(self, X: pd.DataFrame) -> np.ndarray:
        if self._calibrated_model is None:
            raise RuntimeError("SupervisedDetector must be fit before scoring")
        return self._calibrated_model.predict_proba(X)[:, 1]

    @property
    def model(self) -> XGBClassifier:
        """The uncalibrated booster — used for SHAP, never for scoring."""
        if self._raw_model is None:
            raise RuntimeError("SupervisedDetector must be fit before accessing the model")
        return self._raw_model
