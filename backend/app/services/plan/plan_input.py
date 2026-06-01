"""Input validation for prep planner."""

from __future__ import annotations

import re
from datetime import UTC, date, datetime, timedelta

from fastapi import HTTPException, status

from app.core.config import get_settings

_MAX_DAYS = 30
_MAX_MODIFY_CHARS = 500


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


def validate_interview_date(interview_date: date) -> date:
    today = datetime.now(UTC).date()
    if interview_date < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview date must be today or in the future.",
        )
    if interview_date > today + timedelta(days=90):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview date must be within 90 days.",
        )
    return interview_date


def compute_days_count(interview_date: date) -> int:
    today = datetime.now(UTC).date()
    n = (interview_date - today).days + 1
    return max(1, min(_MAX_DAYS, n))


def calendar_date_for_day(interview_date: date, day_number: int, days_count: int) -> date:
    """Map day_number (1..N) to calendar date ending on interview_date."""
    offset = days_count - day_number
    return interview_date - timedelta(days=offset)
