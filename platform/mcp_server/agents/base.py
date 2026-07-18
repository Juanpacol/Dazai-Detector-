"""Shared contract for every specialist agent.

Hard rule enforced by convention across every subclass: `.respond()` must call
at least one grounded tool from `mcp_server/tools/` and build its answer only
from that tool's return value. No subclass may format a number it did not
receive from a tool call — that is what makes the chat safe to demo live.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class AgentResponse:
    answer: str
    sources: list[str] = field(default_factory=list)
    citations: list[dict] = field(default_factory=list)
    tool_trace: list[dict] = field(default_factory=list)
    confidence: float = 0.0
    verified: bool = False
    ok: bool = True


class Agent(ABC):
    name: str

    @abstractmethod
    def respond(self, question: str, emit: Callable[[str, dict], None] | None = None) -> AgentResponse:
        ...
