"""Gemini Flash LLM adapter for the AI copilot (Definitive Plan Phase 7).

NEVER raises — returns None on any error so callers fall back to
rule-based answers. Needs `google-generativeai` installed at runtime to
activate; import is lazy (soft optional dependency for tests).
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

CANDIDATE_GEMINI_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
]


class GeminiAdapter:
    """Thin async adapter over `google-generativeai`.

    Available when both lib AND API key are present.
    """

    def __init__(self, model_name: str | None = None, api_key: str | None = None):
        """Create adapter from env config; model resolved lazily."""
        self._api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self._model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

    @property
    def available(self) -> bool:
        """True when a real API key is configured (library check is lazy)."""
        if not self._api_key:
            return False
        try:
            import google.generativeai  # noqa: F401

            return True
        except ImportError:
            logger.debug("google-generativeai not installed; Gemini adapter unavailable")
            return False

    async def complete(self, prompt: str) -> str | None:
        """Get a completion with candidate model fallback. Returns None on any error (never raises)."""
        if not self.available:
            return None

        import asyncio

        try:
            import google.generativeai as genai

            genai.configure(api_key=self._api_key)
        except Exception as cfg_err:
            logger.warning("Gemini configuration failed: %s", cfg_err)
            return None

        models_to_try = [self._model_name] + [
            m for m in CANDIDATE_GEMINI_MODELS if m != self._model_name
        ]

        for m_name in models_to_try:
            try:
                model = genai.GenerativeModel(m_name)
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        model.generate_content,
                        prompt,
                        generation_config={"temperature": 0.1, "max_output_tokens": 512},
                    ),
                    timeout=10.0,
                )
                if response and response.text:
                    return str(response.text).strip()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Gemini complete with model %s failed: %s", m_name, exc)
                continue

        return None
