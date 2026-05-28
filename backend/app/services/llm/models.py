"""LLM model registry — edit this file to swap models and routing priority.

Free tier only (D-009): Google Generative Language API (Gemini / Gemma) + Groq.

Quick edits:
  1. Reorder ``GOOGLE_MODEL_CHAIN`` — tried top-to-bottom before cross-vendor failover.
  2. Change ``GROQ_MODEL`` — Groq chat id for evaluate/feedback (and failover).
  3. Swap ``TASK_PRIMARY`` values between ``"gemini"`` and ``"groq"`` to flip which vendor runs first.

Optional env overrides (``backend/.env``): ``GEMINI_MODEL``, ``GEMINI_FALLBACK_MODEL``,
``GROQ_MODEL`` — prepended/appended when set; unset = use this file only.
"""

from __future__ import annotations

from typing import Literal

from app.core.config import Settings

Provider = Literal["gemini", "groq"]
Task = Literal["analyze", "questions", "evaluate", "feedback"]

# ---------------------------------------------------------------------------
# Google — order matters (primary → in-vendor fallbacks → last Google attempt)
# ---------------------------------------------------------------------------
GOOGLE_MODEL_CHAIN: list[str] = [
    "gemini-3.5-flash",
    "gemma-4-31b-it",
    "gemma-2-27b-it",
]

# ---------------------------------------------------------------------------
# Groq
# ---------------------------------------------------------------------------
GROQ_MODEL = "llama-3.3-70b-versatile"

# ---------------------------------------------------------------------------
# Task routing — primary vendor; router fails over to the other on 429/5xx/timeout
# ---------------------------------------------------------------------------
TASK_PRIMARY: dict[Task, Provider] = {
    "analyze": "gemini",
    "questions": "gemini",
    "evaluate": "groq",
    "feedback": "groq",
}


def build_google_model_chain(settings: Settings) -> list[str]:
    """Merge file chain with optional ``GEMINI_MODEL`` / ``GEMINI_FALLBACK_MODEL`` env."""
    chain: list[str] = []
    seen: set[str] = set()

    def add(model: str | None) -> None:
        if not model:
            return
        m = model.strip()
        if not m:
            return
        key = m.lower()
        if key in seen:
            return
        seen.add(key)
        chain.append(m)

    if settings.gemini_model:
        add(settings.gemini_model)
    for mid in GOOGLE_MODEL_CHAIN:
        add(mid)
    if settings.gemini_fallback_model:
        add(settings.gemini_fallback_model)

    if not chain:
        raise ValueError("GOOGLE_MODEL_CHAIN is empty and GEMINI_MODEL is unset")
    return chain


def resolve_groq_model(settings: Settings) -> str:
    if settings.groq_model and settings.groq_model.strip():
        return settings.groq_model.strip()
    return GROQ_MODEL


def primary_provider_for_task(task: Task) -> Provider:
    return TASK_PRIMARY[task]
