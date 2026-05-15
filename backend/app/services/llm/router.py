"""LLM router — task-based routing with cross-vendor failover (D-009).

Routing:
    analyze   → Google API (`GEMINI_MODEL`, default Gemma 4 31B IT; then Gemma 2 27B IT if primary is Gemma; then `GEMINI_FALLBACK_MODEL`)
    questions → Google API (same chain as analyze)
    evaluate  → Groq Llama 3.3 70B
    feedback  → Groq Llama 3.3 70B

On 429 / 5xx / timeout the router falls over to the other vendor before giving
up. If both fail, callers get a `degraded=True` result and the API surfaces an
honest hint to the user.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal

from app.core.config import get_settings
from app.services.llm import gemini, groq
from app.services.llm.errors import RecoverableLLMError

log = logging.getLogger(__name__)

Task = Literal["analyze", "questions", "evaluate", "feedback"]


@dataclass(slots=True)
class LLMResult:
    """Provider-agnostic wrapper around a model response.

    `degraded=True` signals that the primary provider failed and the caller
    should narrate that honestly to the user.
    """

    content: dict | list | str
    provider: str
    prompt_version: str
    degraded: bool = False
    #: When the call chain fails, populated for debugging (errors + optional raw model text).
    failure_debug: dict[str, object] | None = None


_TASK_TO_PRIMARY: dict[Task, str] = {
    "analyze": "gemini",
    "questions": "gemini",
    "evaluate": "groq",
    "feedback": "groq",
}


class LLMRouter:
    """The single LLM entry point.

    Vendor SDK calls live only under `app/services/llm/`. Prompt caching is
    handled via stable system prompts + vendor-side behavior (D-009).
    """

    async def call(
        self,
        *,
        task: Task,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict | None = None,
        max_output_tokens: int | None = None,
    ) -> LLMResult:
        _ = response_schema  # reserved for structured-output tightening
        primary = _TASK_TO_PRIMARY[task]
        secondary = "groq" if primary == "gemini" else "gemini"

        primary_exc: RecoverableLLMError | None = None
        try:
            return await self._dispatch(
                provider=primary,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_output_tokens=max_output_tokens,
            )
        except RecoverableLLMError as e:
            primary_exc = e
            log.warning(
                "llm primary %s failed for task=%s: %s — failing over",
                primary,
                task,
                e,
            )

        secondary_exc: RecoverableLLMError | None = None
        try:
            result = await self._dispatch(
                provider=secondary,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_output_tokens=max_output_tokens,
            )
            result.degraded = True
            return result
        except RecoverableLLMError as e:
            secondary_exc = e
            log.error("llm fallback %s also failed for task=%s: %s", secondary, task, e)
            settings = get_settings()
            p_raw = (
                primary_exc.raw_response[:50_000]
                if primary_exc and primary_exc.raw_response
                else None
            )
            s_raw = (
                secondary_exc.raw_response[:50_000]
                if secondary_exc and secondary_exc.raw_response
                else None
            )
            return LLMResult(
                content={"error": "both_providers_unavailable"},
                provider="none",
                prompt_version=settings.prompt_version,
                degraded=True,
                failure_debug={
                    "primary_provider": primary,
                    "primary_error": str(primary_exc) if primary_exc else None,
                    "primary_raw": p_raw,
                    "secondary_provider": secondary,
                    "secondary_error": str(secondary_exc) if secondary_exc else None,
                    "secondary_raw": s_raw,
                },
            )

    async def _dispatch(
        self,
        *,
        provider: str,
        system_prompt: str,
        user_prompt: str,
        max_output_tokens: int | None = None,
    ) -> LLMResult:
        settings = get_settings()
        pv = settings.prompt_version
        if provider == "gemini":
            data = await gemini.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_output_tokens=max_output_tokens,
            )
        elif provider == "groq":
            data = await groq.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_output_tokens=max_output_tokens,
            )
        else:
            raise RecoverableLLMError(f"unknown provider {provider!r}")
        return LLMResult(content=data, provider=provider, prompt_version=pv, degraded=False)
