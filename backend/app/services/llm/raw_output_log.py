"""Verbatim LLM response logging (string from API before JSON parsing).

Enable with `LLM_LOG_RAW_COMPLETION=true` or local `ENV` (see `Settings.should_log_llm_raw_completion`).
"""

from __future__ import annotations

import logging

from app.core.config import get_settings

log = logging.getLogger(__name__)


def log_verbatim_llm_completion(*, provider: str, model: str, text: str) -> None:
    """Log the exact `text` returned by the SDK — no reformatting, no JSON pretty-print."""
    if not get_settings().should_log_llm_raw_completion:
        return
    log.info(
        "--- verbatim LLM provider=%s model=%s chars=%s ---\n%s\n--- end verbatim ---",
        provider,
        model,
        len(text),
        text,
    )
