"""Cheap section detection via common headers — signal for the LLM only."""

from __future__ import annotations

import re

_HEADER_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("experience", re.compile(r"(?im)^\s*(experience|work experience|employment)\s*:?\s*$")),
    ("projects", re.compile(r"(?im)^\s*(projects?|selected projects?|side projects?)\s*:?\s*$")),
    ("skills", re.compile(r"(?im)^\s*(skills?|technical skills?|stack)\s*:?\s*$")),
    ("education", re.compile(r"(?im)^\s*(education|academic|university)\s*:?\s*$")),
    ("summary", re.compile(r"(?im)^\s*(summary|about|profile|objective)\s*:?\s*$")),
]


def detect_section_labels(resume_text: str) -> dict[str, bool]:
    found: dict[str, bool] = {k: False for k, _ in _HEADER_PATTERNS}
    for key, pat in _HEADER_PATTERNS:
        if pat.search(resume_text or ""):
            found[key] = True
    return found


def format_sections_line(resume_text: str) -> str:
    """Human-readable line for the user prompt (SECTIONS DETECTED: …)."""
    found = detect_section_labels(resume_text)
    present = [k for k, v in found.items() if v]
    missing_core = []
    if not found["education"]:
        missing_core.append("no education")
    if not found["skills"]:
        missing_core.append("no skills section found")
    if present:
        parts = ", ".join(present)
        if missing_core:
            return f"{parts} ({', '.join(missing_core)})"
        return parts
    if missing_core:
        return f"unclear headers ({', '.join(missing_core)})"
    return "unclear headers"
