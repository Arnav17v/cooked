"""Build resume text for the LLM — whitespace normalize, word cap, truncation note."""

from __future__ import annotations

import re

from app.core.config import get_settings


def normalize_whitespace(text: str) -> str:
    t = (text or "").strip()
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t


def truncate_resume_for_llm(resume_text: str) -> tuple[str, bool]:
    """Truncate from the bottom if over ~1500-1800 tokens (word-based heuristic)."""
    settings = get_settings()
    words = resume_text.split()
    # ~0.75 words per token for English prose → 1500 tokens ≈ 1125 words; use 1200 ceiling
    max_words = max(100, int(settings.llm_resume_text_token_soft_limit * 0.8))
    if len(words) <= max_words:
        return resume_text, False
    clipped = words[:max_words]
    body = " ".join(clipped)
    note = (
        "\n\n[truncated — resume exceeded limit, showing first ~"
        f"{settings.llm_resume_text_token_soft_limit} tokens]"
    )
    return body + note, True
