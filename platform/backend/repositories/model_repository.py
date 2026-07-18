"""Backend-facing view over model quality metrics.

Repository pattern: mirrors AlertRepository — services only ever go through
this class, never through `mcp_server.tools.model_tools` directly.
"""

from __future__ import annotations

from mcp_server.tools import model_tools


class ModelRepository:
    def latest_metrics(self) -> dict | None:
        return model_tools.latest()
