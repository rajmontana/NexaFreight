"""Ollama LLM adapter for the NexaFreight AI copilot (local, no API key needed).

Thin async wrapper over the ``ollama`` Python SDK (already in pyproject.toml).
Follows the same minimal interface as GeminiAdapter:

  adapter.available  -> bool
  await adapter.complete(prompt) -> str | None

NEVER raises -- returns None on any error so callers fall back to rule-based answers.
Needs a running Ollama server at ``ollama_base_url`` (default http://localhost:11434).
"""

from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


class OllamaAdapter:
    """Thin async adapter over the ``ollama`` SDK.

    Available when the ``ollama`` package is installed AND the Ollama server
    is reachable at startup.  The first ``complete()`` call performs an
    implicit connectivity check; failures are swallowed and availability
    flipped to False so subsequent calls skip straight to rule fallback.
    """

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.1:8b",
    ) -> None:
        self._base_url = base_url
        self._model = model
        # None = unknown (not yet probed), True/False after first call
        self._reachable: bool | None = None

    @property
    def available(self) -> bool:
        """True when the ollama package is importable AND server was reachable
        on the last attempt.  Returns True before the first attempt (optimistic)
        so the copilot will try once and disable itself on failure."""
        try:
            import ollama  # noqa: F401

            # If we have probed and it was unreachable, report unavailable.
            return self._reachable is not False
        except ImportError:
            logger.debug("ollama package not installed; OllamaAdapter unavailable")
            return False

    async def complete(self, prompt: str) -> str | None:
        """Get a completion from the local Ollama server.

        Returns None on any error (never raises).
        """
        try:
            import ollama

            client = ollama.AsyncClient(host=self._base_url)
            response = await asyncio.wait_for(
                client.chat(
                    model=self._model,
                    messages=[{"role": "user", "content": prompt}],
                    options={"temperature": 0.1, "num_predict": 512},
                ),
                timeout=30.0,  # generous timeout for local inference
            )
            self._reachable = True
            text = response.message.content  # type: ignore[attr-defined]
            return str(text).strip() if text else None
        except TimeoutError:
            logger.warning(
                "OllamaAdapter: request timed out (model=%s, host=%s)",
                self._model,
                self._base_url,
            )
            self._reachable = False
            return None
        except Exception as exc:  # noqa: BLE001
            logger.warning("OllamaAdapter complete failed: %s", exc)
            self._reachable = False
            return None
