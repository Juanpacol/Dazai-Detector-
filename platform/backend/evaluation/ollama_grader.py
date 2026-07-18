"""Optional local qualitative grader powered by Ollama."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass

import httpx


@dataclass(frozen=True)
class OllamaConfig:
    base_url: str
    model: str
    enabled: bool


class OllamaGrader:
    def __init__(self, base_url: str | None = None, model: str | None = None, timeout: float = 30.0):
        resolved_base_url = (base_url or os.getenv("OLLAMA_EVAL_URL") or os.getenv("OLLAMA_BASE_URL") or "").strip()
        resolved_model = (model or os.getenv("OLLAMA_EVAL_MODEL") or os.getenv("OLLAMA_MODEL") or "").strip()
        self.config = OllamaConfig(
            base_url=resolved_base_url.rstrip("/"),
            model=resolved_model,
            enabled=bool(resolved_base_url and resolved_model),
        )
        self._timeout = timeout

    def review(self, case: dict, response: dict) -> dict | None:
        if not self.config.enabled:
            return None

        prompt = self._build_prompt(case, response)
        try:
            payload = {
                "model": self.config.model,
                "stream": False,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a strict evaluation assistant. "
                            "Return only valid JSON with keys groundedness, clarity, conciseness, overall, notes."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            }
            with httpx.Client(timeout=self._timeout) as client:
                api_response = client.post(f"{self.config.base_url}/api/chat", json=payload)
                api_response.raise_for_status()
            content = api_response.json()["message"]["content"]
            return self._parse_content(content)
        except Exception as exc:  # pragma: no cover - optional enhancement
            return {"overall": 0.0, "notes": f"Ollama grader unavailable: {exc}"}

    @staticmethod
    def _build_prompt(case: dict, response: dict) -> str:
        return json.dumps(
            {
                "question": case["question"],
                "expected_intent": case["expected_intent"],
                "answer": response.get("answer", ""),
                "intent": response.get("intent", ""),
                "citations": response.get("citations", []),
                "sources": response.get("sources", []),
                "verified": response.get("verified", False),
                "ok": response.get("ok", False),
            },
            indent=2,
            ensure_ascii=False,
        )

    @staticmethod
    def _parse_content(content: str) -> dict:
        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
        return {"overall": 0.0, "notes": content.strip()}
