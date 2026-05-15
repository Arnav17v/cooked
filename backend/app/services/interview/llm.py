"""Interview LLM — same ``LLMRouter`` chain as resume roast (``task="analyze"``, D-009)."""

from __future__ import annotations

import logging

from app.core.config import get_settings
from app.services.llm.errors import RecoverableLLMError
from app.services.llm.router import LLMRouter

log = logging.getLogger(__name__)


async def generate_interview_json(
    *,
    full_system_prompt: str,
    user_prompt: str,
    max_output_tokens: int | None = None,
) -> tuple[dict[str, object], bool]:
    """Return ``(parsed_json, degraded)`` — same ``LLMRouter`` chain as resume roast (``task="analyze"``)."""

    settings = get_settings()
    cap = max_output_tokens if max_output_tokens is not None else settings.llm_interview_max_output_tokens

    router = LLMRouter()
    result = await router.call(
        task="analyze",
        system_prompt=full_system_prompt,
        user_prompt=user_prompt,
        max_output_tokens=cap,
    )

    if isinstance(result.content, dict) and result.content.get("error") == "both_providers_unavailable":
        log.warning("interview LLM: both providers failed (same chain as resume analyze)")
        raise RecoverableLLMError(
            "Interview AI unavailable: Gemini and Groq both failed. "
            "Check GEMINI_API_KEY (quota), set a valid GROQ_API_KEY, and retry."
        )

    if not isinstance(result.content, dict):
        raise RecoverableLLMError("Interview AI returned a non-object JSON response. Try again.")

    return result.content, result.degraded
