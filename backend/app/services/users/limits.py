"""Per-user daily caps (roasts + quizzes) — enforced before LLM work."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.interview_session import InterviewSession
from app.models.resume import Resume
from app.models.user import User
from app.schemas.interview_quiz_scores import normalize_interview_quiz_scores


def reset_daily_counter_if_new_day(user: User) -> None:
    today = date.today()
    if user.last_analysis_date != today:
        user.analyses_today = 0
        user.last_analysis_date = today


def _parse_quiz_at(raw: object) -> date | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC).date()
    except ValueError:
        return None


async def count_user_quizzes_completed_today(
    session: AsyncSession, user_id: uuid.UUID
) -> int:
    today = date.today()
    rows = (
        await session.execute(select(Resume).where(Resume.user_id == user_id))
    ).scalars().all()
    n = 0
    for resume in rows:
        for entry in normalize_interview_quiz_scores(resume.interview_quiz_scores):
            if _parse_quiz_at(entry.get("at")) == today:
                n += 1
    return n


async def count_user_in_progress_quizzes(
    session: AsyncSession, user_id: uuid.UUID
) -> int:
    stmt = (
        select(InterviewSession.id)
        .join(Resume, InterviewSession.resume_id == Resume.id)
        .where(
            Resume.user_id == user_id,
            InterviewSession.completed_at.is_(None),
        )
    )
    return len((await session.execute(stmt)).all())


async def assert_can_start_quiz(
    session: AsyncSession,
    user_id: uuid.UUID,
    resume_id: uuid.UUID,
) -> None:
    """Per-resume completed-session cap for free tier; Pro/dev bypass in entitlements."""
    from app.services.users.entitlements import assert_can_start_quiz as _assert

    await _assert(session, user_id, resume_id)
