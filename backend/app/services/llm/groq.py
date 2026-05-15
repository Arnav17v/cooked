"""Groq Llama 3.3 70B — JSON responses + failover for analyze/questions."""

from __future__ import annotations

import json
import logging

from groq import APIStatusError, AsyncGroq

from app.core.config import get_settings
from app.services.llm.errors import RecoverableLLMError
from app.services.llm.raw_output_log import log_verbatim_llm_completion

log = logging.getLogger(__name__)

_GROQ_MODEL = "llama-3.3-70b-versatile"


async def generate_json(
    *,
    system_prompt: str,
    user_prompt: str,
    max_output_tokens: int | None = None,
) -> dict[str, object]:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RecoverableLLMError("GROQ_API_KEY is not set")
    cap = max_output_tokens if max_output_tokens is not None else settings.llm_max_output_tokens
    client = AsyncGroq(api_key=settings.groq_api_key)
    try:
        chat = await client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.35,
            max_tokens=int(cap) if cap and cap > 0 else settings.llm_max_output_tokens,
            response_format={"type": "json_object"},
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
    log_verbatim_llm_completion(provider="groq", model=_GROQ_MODEL, text=raw)
    raw_dbg = raw[:50_000]
    try:
        out = json.loads(raw)
    except json.JSONDecodeError as e:
        log.warning(
            "Groq JSON parse fail (first %s chars):\n%s",
            min(len(raw), 50_000),
            raw_dbg,
        )
        raise RecoverableLLMError(f"invalid JSON from Groq: {e}", raw_response=raw_dbg) from e
    if not isinstance(out, dict):
        raise RecoverableLLMError("Groq JSON root must be an object", raw_response=raw_dbg)
    return out
