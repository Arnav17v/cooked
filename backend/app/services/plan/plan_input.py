"""Input validation for prep planner."""

from __future__ import annotations

import re
from datetime import UTC, date, datetime, timedelta

from fastapi import HTTPException, status

from app.core.config import get_settings

PLAN_MAX_DAYS = 8
_MAX_MODIFY_CHARS = 500


def utc_today() -> date:
    return datetime.now(UTC).date()


def count_words(text: str) -> int:
    return len(re.findall(r"\S+", text.strip()))


def sanitize_text(text: str, *, max_len: int) -> str:
    cleaned = text.replace("\x00", "").strip()
    if len(cleaned) > max_len:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text exceeds maximum length ({max_len} characters).",
        )
    return cleaned


def validate_jd_text(jd_text: str) -> str:
    cap = get_settings().resume_word_cap
    cleaned = sanitize_text(jd_text, max_len=cap * 40)
    if count_words(cleaned) > cap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job description exceeds {cap} words.",
        )
    return cleaned


def validate_modify_instruction(text: str) -> str:
    cleaned = sanitize_text(text, max_len=_MAX_MODIFY_CHARS)
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instruction cannot be empty.",
        )
    return cleaned


def validate_days_count(days_count: int) -> int:
    try:
        n = int(days_count)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"days_count must be an integer from 1 to {PLAN_MAX_DAYS}.",
        ) from exc
    if n < 1 or n > PLAN_MAX_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan length must be between 1 and {PLAN_MAX_DAYS} days.",
        )
    return n


def interview_date_for_days_count(days_count: int) -> date:
    """Day 1 = today; last day = today + (days_count - 1). Stored on prep_plans.interview_date."""
    n = validate_days_count(days_count)
    return utc_today() + timedelta(days=n - 1)


def calendar_date_for_day(interview_date: date, day_number: int, days_count: int) -> date:
    """Map day_number (1..N) to calendar date ending on interview_date."""
    offset = days_count - day_number
    return interview_date - timedelta(days=offset)
