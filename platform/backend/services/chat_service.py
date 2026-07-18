"""Backend entry point into the shared multi-agent chat.

The backend and the MCP server both call `IntentRouter` directly — one agent
implementation, two transports (REST here, MCP tool call in `mcp_server/server.py`).
"""

from __future__ import annotations

from mcp_server.agents.router import IntentRouter

_router = IntentRouter()


class ChatService:
    def ask(self, question: str) -> dict:
        return _router.dispatch(question)
