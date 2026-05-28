"""Google Generative Language API — JSON dict responses for analyze/questions.

Supports **Gemini** and **Gemma** models behind the same API key. Retries 429 / quota on
the same id, then optional **Gemma 2 27B IT** (when primary is Gemma), then `gemini_fallback_model`,
before the router fails over to Groq.
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import TYPE_CHECKING

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.services.llm.dev_trace import emit_llm_dev_event
from app.services.llm.errors import RecoverableLLMError
from app.services.llm.json_util import parse_and_repair_json
from app.services.llm.models import build_google_model_chain
from app.services.llm.raw_output_log import log_verbatim_llm_completion

if TYPE_CHECKING:
    from pydantic import BaseModel

log = logging.getLogger(__name__)

_RETRY_IN_RE = re.compile(r"retry\s+in\s+([\d.]+)\s*s", re.I)
_RAW_DEBUG_CAP = 50_000

_client: genai.Client | None = None


def get_gemini_client() -> genai.Client:
    """Get or create the global Gemini client instance (pooled)."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RecoverableLLMError("GEMINI_API_KEY is not set")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _gemini_retry_delay_seconds(api_message: str, attempt_idx: int) -> float:
    """Sleep before retrying: prefer Google's hint + small buffer."""
    if m := _RETRY_IN_RE.search(api_message):
        sec = float(m.group(1))
        return max(3.0, min(sec + 2.0, 120.0))
    return min(15.0 * (2**attempt_idx), 90.0)


def _looks_like_quota_retry(err: RecoverableLLMError) -> bool:
    t = str(err).lower()
    return (
        "429" in str(err)
        or "quota" in t
        or "resource exhausted" in t
        or "rate" in t
        or "exceeded" in t
    )


def _looks_like_transient_upstream_retry(err: RecoverableLLMError) -> bool:
    """Google occasionally returns 5xx / internal errors (seen on Gemma); brief retry helps."""
    t = str(err).lower()
    return (
        "500" in t
        or "internal error" in t
        or "internal server" in t
        or "503" in t
        or "service unavailable" in t
        or "504" in t
        or "deadline" in t
        or "unavailable" in t
    )


def _canonical_google_model_name(model_name: str) -> str:
    """Map env-style ids to SDK ids (bare `gemma-*` -> `models/gemma-*` or 500 errors)."""
    m = model_name.strip()
    if m.startswith("models/"):
        return m
    if m.lower().startswith("gemma-"):
        return f"models/{m}"
    return m


def _is_gemma_model(canonical_name: str) -> bool:
    base = canonical_name.rsplit("/", 1)[-1]
    return base.lower().startswith("gemma-")


_FENCE_JSON_RE = re.compile(r"```(?:json)?\s*\n(.*?)```", re.I | re.DOTALL)


def _extract_fenced_json(text: str) -> str | None:
    m = _FENCE_JSON_RE.search(text)
    if not m:
        return None
    return m.group(1).strip()


def _slice_balanced_object(s: str, start: int) -> str | None:
    if start >= len(s) or s[start] != "{":
        return None
    depth = 0
    for j in range(start, len(s)):
        if s[j] == "{":
            depth += 1
        elif s[j] == "}":
            depth -= 1
            if depth == 0:
                return s[start : j + 1]
    return None


def _collect_parseable_objects(s: str) -> list[dict[str, object]]:
    found: list[dict[str, object]] = []
    i = 0
    while True:
        j = s.find("{", i)
        if j < 0:
            break
        blob = _slice_balanced_object(s, j)
        if blob is None:
            i = j + 1
            continue
        try:
            obj = parse_and_repair_json(blob)
            if isinstance(obj, dict):
                found.append(obj)
        except Exception:
            pass
        i = j + 1
    return found


def _pick_best_roast_candidate(candidates: list[dict[str, object]]) -> dict[str, object] | None:
    """Prefer root roast-shaped dict (numeric score) over nested fragments (e.g. one question object)."""
    if not candidates:
        return None

    def rank(d: dict[str, object]) -> tuple[int, int]:
        sc = d.get("score")
        numeric = isinstance(sc, (int, float)) and not isinstance(sc, bool)
        tier = 2 if numeric else (1 if "score" in d else 0)
        try:
            import json
            bulk = len(json.dumps(d, sort_keys=True))
        except Exception:
            bulk = len(str(d))
        return (tier, bulk)

    return max(candidates, key=rank)


def _parse_json_object_from_text(text: str) -> dict[str, object] | None:
    """Parse dict from messy Gemma output: fenced ```json blocks, then scan balanced `{…}` objects."""
    if not text:
        return None
    s = text.strip()

    fenced = _extract_fenced_json(s)
    scan_targets = []
    if fenced:
        scan_targets.append(fenced)
    scan_targets.append(s)

    for chunk in scan_targets:
        try:
            out = parse_and_repair_json(chunk)
            if isinstance(out, dict):
                return out
        except ValueError:
            pass
        candidates = _collect_parseable_objects(chunk)
        best = _pick_best_roast_candidate(candidates)
        if best is not None:
            return best

    return None


async def generate_json_single_model_async(
    *,
    model_name: str,
    system_prompt: str,
    user_prompt: str,
    max_output_tokens: int | None = None,
    response_schema: type[BaseModel] | None = None,
) -> dict[str, object]:
    """Call Google GenAI SDK asynchronously for a single model, returning a parsed JSON dict."""
    client = get_gemini_client()
    mid = _canonical_google_model_name(model_name)
    settings = get_settings()
    cap = (
        max_output_tokens if max_output_tokens is not None else settings.llm_max_output_tokens
    )

    config = types.GenerateContentConfig(
        temperature=0.35,
        system_instruction=system_prompt,
    )
    if cap and cap > 0:
        config.max_output_tokens = int(cap)

    if not _is_gemma_model(mid):
        config.response_mime_type = "application/json"
        if response_schema:
            config.response_schema = response_schema

    try:
        resp = await client.aio.models.generate_content(
            model=mid,
            contents=user_prompt,
            config=config,
        )
    except Exception as e:
        raise RecoverableLLMError(str(e)) from e

    text = (getattr(resp, "text", None) or "").strip()
    if not text:
        raise RecoverableLLMError("empty Gemini response")

    log_verbatim_llm_completion(provider="google", model=mid, text=text)
    raw_snip = text[:_RAW_DEBUG_CAP]

    if _is_gemma_model(mid):
        out = _parse_json_object_from_text(text)
        if out is None:
            log.warning(
                "Gemma returned text we could not parse as JSON (first %s chars):\n%s",
                min(len(text), _RAW_DEBUG_CAP),
                raw_snip,
            )
            raise RecoverableLLMError(
                f"invalid JSON from Gemma ({mid})",
                raw_response=raw_snip,
            )
    else:
        try:
            out = parse_and_repair_json(text)
        except ValueError as e:
            log.warning(
                "Gemini JSON parse fail (first %s chars):\n%s",
                min(len(text), _RAW_DEBUG_CAP),
                raw_snip,
            )
            raise RecoverableLLMError(
                f"invalid JSON from Gemini: {e}",
                raw_response=raw_snip,
            ) from e
        if not isinstance(out, dict):
            raise RecoverableLLMError(
                "Gemini JSON root must be an object",
                raw_response=raw_snip,
            )

    return out


async def generate_json(
    *,
    system_prompt: str,
    user_prompt: str,
    max_output_tokens: int | None = None,
    task: str | None = None,
    response_schema: type[BaseModel] | None = None,
) -> dict[str, object]:
    """Route Google Generative AI request with retries across models in chain."""
    settings = get_settings()
    seq = build_google_model_chain(settings)
    if not seq:
        raise RecoverableLLMError("Google model chain is empty — edit services/llm/models.py")

    last_err: RecoverableLLMError | None = None
    for mi, model_name in enumerate(seq):
        is_primary = mi == 0
        tries = settings.gemini_429_max_retries if is_primary else max(2, settings.gemini_429_max_retries // 2)
        tries = max(1, tries)

        for attempt in range(tries):
            try:
                out = await generate_json_single_model_async(
                    model_name=model_name,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    max_output_tokens=max_output_tokens,
                    response_schema=response_schema,
                )
                if mi > 0:
                    emit_llm_dev_event(
                        kind="model_ok",
                        task=task,
                        model=model_name,
                        provider="gemini",
                        chain_index=mi + 1,
                    )
                return out
            except RecoverableLLMError as e:
                last_err = e
                if _looks_like_quota_retry(e) and attempt + 1 < tries:
                    delay = _gemini_retry_delay_seconds(str(e), attempt)
                    log.warning(
                        "Google API quota/rate (%s attempt %s/%s): %.1fs then retry — %s",
                        model_name,
                        attempt + 1,
                        tries,
                        delay,
                        str(e)[:200],
                    )
                    await asyncio.sleep(delay)
                    continue
                if _looks_like_transient_upstream_retry(e) and attempt + 1 < tries:
                    delay = min(8.0, 2.0 * (attempt + 1))
                    log.warning(
                        "Google API transient (%s attempt %s/%s): %.1fs then retry — %s",
                        model_name,
                        attempt + 1,
                        tries,
                        delay,
                        str(e)[:200],
                    )
                    await asyncio.sleep(delay)
                    continue
                if mi + 1 < len(seq):
                    next_model = seq[mi + 1]
                    emit_llm_dev_event(
                        kind="model_switch",
                        task=task,
                        from_model=model_name,
                        to_model=next_model,
                        provider="gemini",
                        reason=str(e)[:240],
                    )
                    log.warning(
                        "Google API model %s not usable (%s…); trying next Google API model",
                        model_name,
                        str(e)[:120],
                    )
                break

    if last_err is None:
        raise RecoverableLLMError("Google API LLM: no attempts completed")
    raise last_err

