"""Health probe.

Cheap, no DB hit. Also serves as the target for any future cron-pinger
(deferred in v1 per D-014).
"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/config")
async def public_config() -> dict[str, object]:
    """Public feature flags + caps for the frontend (no auth)."""
    s = get_settings()
    return {
        "dev": s.dev,
        "renew_notes_enabled": s.dev,
        "daily_roast_cap": None if s.unlimited_daily_roasts else s.daily_analysis_cap,
        "daily_quiz_cap": None if s.unlimited_daily_quizzes else s.daily_quiz_cap,
    }
