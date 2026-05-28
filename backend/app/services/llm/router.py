"""LLM router — task-based routing with cross-vendor failover (D-009).

Edit ``services/llm/models.py`` to swap model ids and task→vendor priority.
On 429 / 5xx / timeout the router fails over to the other vendor.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from pydantic import BaseModel

from app.core.config import get_settings
from app.services.llm import gemini, groq
from app.services.llm.dev_trace import emit_llm_dev_event
from app.services.llm.errors import RecoverableLLMError
from app.services.llm.models import Task, primary_provider_for_task

log = logging.getLogger(__name__)

# Re-export for callers that imported Task from router.
__all__ = ["LLMResult", "LLMRouter", "Task"]


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
        response_schema: type[BaseModel] | None = None,
        max_output_tokens: int | None = None,
    ) -> LLMResult:
        primary = primary_provider_for_task(task)
        secondary = "groq" if primary == "gemini" else "gemini"

        primary_exc: RecoverableLLMError | None = None
        try:
            return await self._dispatch(
                provider=primary,
                task=task,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_schema=response_schema,
                max_output_tokens=max_output_tokens,
            )
        except RecoverableLLMError as e:
            primary_exc = e
            emit_llm_dev_event(
                kind="vendor_failover",
                task=task,
                from_provider=primary,
                to_provider=secondary,
                reason=str(e)[:240],
            )
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
                task=task,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_schema=response_schema,
                max_output_tokens=max_output_tokens,
            )
            result.degraded = True
            emit_llm_dev_event(
                kind="vendor_ok",
                task=task,
                provider=secondary,
                degraded=True,
            )
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
        task: Task,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[BaseModel] | None = None,
        max_output_tokens: int | None = None,
    ) -> LLMResult:
        settings = get_settings()
        pv = settings.prompt_version
        if provider == "gemini":
            data = await gemini.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_output_tokens=max_output_tokens,
                task=task,
                response_schema=response_schema,
            )
        elif provider == "groq":
            data = await groq.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_output_tokens=max_output_tokens,
                task=task,
                response_schema=response_schema,
            )
        else:
            raise RecoverableLLMError(f"unknown provider {provider!r}")
        return LLMResult(content=data, provider=provider, prompt_version=pv, degraded=False)
