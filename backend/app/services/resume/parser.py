"""Resume parsing — PDF via pdfplumber with pymupdf fallback; pasted text passthrough.

Enforces the **4000-word cap** before any LLM call (guardrails). Minimum word
count for a roast is configurable (`MIN_ROAST_WORDS`).
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass

from app.core.config import get_settings

log = logging.getLogger(__name__)


@dataclass(slots=True)
class ParsedResume:
    text: str
    word_count: int
    truncated: bool


def parse_text(raw: str) -> ParsedResume:
    """Normalize pasted resume text and enforce the word cap."""
    words = raw.strip().split()
    cap = get_settings().resume_word_cap
    truncated = len(words) > cap
    capped = words[:cap]
    return ParsedResume(
        text=" ".join(capped),
        word_count=len(capped),
        truncated=truncated,
    )


def parse_pdf(pdf_bytes: bytes) -> ParsedResume:
    """Extract text from PDF via pdfplumber; fall back to pymupdf if empty."""
    text = _extract_pdf_pdfplumber(pdf_bytes)
    if not text.strip():
        log.warning("pdfplumber returned empty text — trying pymupdf fallback")
        text = _extract_pdf_pymupdf(pdf_bytes)
    return parse_text(text)


def _extract_pdf_pdfplumber(pdf_bytes: bytes) -> str:
    import pdfplumber

    chunks: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            if t.strip():
                chunks.append(t)
    return "\n".join(chunks)


def _extract_pdf_pymupdf(pdf_bytes: bytes) -> str:
    import pymupdf

    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    try:
        chunks: list[str] = []
        for page in doc:
            chunks.append(page.get_text("text") or "")
        return "\n".join(chunks)
    finally:
        doc.close()


def validate_min_words(word_count: int) -> None:
    """Raise ValueError with message for HTTP layer if too short."""
    min_w = get_settings().min_roast_words
    if word_count < min_w:
        raise ValueError(f"too_short:{min_w}")
