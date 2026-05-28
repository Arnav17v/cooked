"""Groq Llama 3.3 70B — JSON responses + failover for analyze/questions."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from groq import APIStatusError, AsyncGroq

from app.core.config import get_settings
from app.services.llm.errors import RecoverableLLMError
from app.services.llm.json_util import parse_and_repair_json
from app.services.llm.models import resolve_groq_model
from app.services.llm.raw_output_log import log_verbatim_llm_completion

if TYPE_CHECKING:
    from pydantic import BaseModel

log = logging.getLogger(__name__)

_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    """Get or create the global AsyncGroq client instance (pooled)."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise RecoverableLLMError("GROQ_API_KEY is not set")
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client


async def generate_json(
    *,
    system_prompt: str,
    user_prompt: str,
    max_output_tokens: int | None = None,
    task: str | None = None,
    response_schema: type[BaseModel] | None = None,
) -> dict[str, object]:
    _ = task  # Groq uses a single model; vendor failover events come from the router.
    settings = get_settings()
    client = get_groq_client()
    model = resolve_groq_model(settings)
    cap = max_output_tokens if max_output_tokens is not None else settings.llm_max_output_tokens

    response_format: dict[str, object] = {"type": "json_object"}
    if response_schema:
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": response_schema.__name__,
                "schema": response_schema.model_json_schema(),
            },
        }

    try:
        chat = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.35,
            max_tokens=int(cap) if cap and cap > 0 else settings.llm_max_output_tokens,
            response_format=response_format,
        )
    except APIStatusError as e:
        code = getattr(e, "status_code", None) or 500
        if code in (401, 403, 408, 429, 500, 502, 503, 504):
            raise RecoverableLLMError(str(e)) from e
        raise
    except Exception as e:
        raise RecoverableLLMError(str(e)) from e

    raw = (chat.choices[0].message.content or "").strip()
    if not raw:
        raise RecoverableLLMError("empty Groq response")
    log_verbatim_llm_completion(provider="groq", model=model, text=raw)
    raw_dbg = raw[:50_000]

    try:
        out = parse_and_repair_json(raw)
    except ValueError as e:
        log.warning(
            "Groq JSON parse fail (first %s chars):\n%s",
            min(len(raw), 50_000),
            raw_dbg,
        )
        raise RecoverableLLMError(f"invalid JSON from Groq: {e}", raw_response=raw_dbg) from e

    if not isinstance(out, dict):
        raise RecoverableLLMError("Groq JSON root must be an object", raw_response=raw_dbg)

    return out

