"""Read-side analysis endpoints — latest completed roast per resume."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import optional_clerk_subject
from app.db.session import get_session
from app.models.analysis import Analysis
from app.models.resume import Resume
from app.schemas.interview_quiz_scores import normalize_interview_quiz_scores
from app.services.users.access import require_resume_readable

router = APIRouter(prefix="/resume", tags=["analysis"])


async def _latest_done_with_resume(
    session: AsyncSession, resume_id: uuid.UUID
) -> tuple[Analysis | None, Resume | None]:
    stmt = (
        select(Analysis, Resume)
        .join(Resume, Analysis.resume_id == Resume.id)
        .where(Analysis.resume_id == resume_id, Analysis.status == "done")
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    got = (await session.execute(stmt)).first()
    if got is None:
        return None, None
    return got[0], got[1]


@router.get("/{resume_id}/score")
async def get_score(
    resume_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    await require_resume_readable(session, resume_id, clerk_subject)
    row, resume = await _latest_done_with_resume(session, resume_id)
    if row is None or resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis yet",
        )
    bd = row.score_breakdown or {}
    one = row.one_liner or bd.get("one_liner") or bd.get("headline")
    return {
        "cooked_score": row.cooked_score,
        "score": row.cooked_score,
        "heat_label": bd.get("heat_label"),
        "headline": one,
        "one_liner": one,
        "role": resume.target_role,
        "score_breakdown": bd,
        "share_slug": row.share_slug,
        "degraded": bool(bd.get("analyze_degraded") or bd.get("degraded")),
        "interview_quiz_scores": normalize_interview_quiz_scores(resume.interview_quiz_scores),
    }


@router.get("/{resume_id}/flags")
async def get_flags(
    resume_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    await require_resume_readable(session, resume_id, clerk_subject)
    row, _ = await _latest_done_with_resume(session, resume_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis yet",
        )
    return {
        "red_flags": row.red_flags or [],
        "flags": row.red_flags or [],
        "rewritten_bullets": row.rewritten_bullets or [],
        "share_slug": row.share_slug,
    }
