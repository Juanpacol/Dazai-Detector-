"""Backs the "Model Health" dashboard panel — thin wrapper over ModelRepository."""

from __future__ import annotations

from backend.repositories.model_repository import ModelRepository


class ModelService:
    def __init__(self):
        self._repository = ModelRepository()

    def latest_metrics(self) -> dict | None:
        return self._repository.latest_metrics()
