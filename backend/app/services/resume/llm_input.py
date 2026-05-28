"""Build resume text for the LLM — whitespace normalize, word cap, truncation note."""

from __future__ import annotations

import re


def normalize_whitespace(text: str) -> str:
    t = (text or "").strip()
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t


# Shared cap for roast, quiz, and notes prompts (first N words kept).
LLM_RESUME_MAX_WORDS = 1500


def truncate_resume_for_llm(resume_text: str) -> tuple[str, bool]:
    """Truncate from the bottom if over ``LLM_RESUME_MAX_WORDS`` (1500 by default)."""
    words = resume_text.split()
    max_words = LLM_RESUME_MAX_WORDS
    if len(words) <= max_words:
        return resume_text, False
    clipped = words[:max_words]
    body = " ".join(clipped)
    note = f"\n\n[truncated — resume exceeded {max_words} words, showing the first {max_words}]"
    return body + note, True
