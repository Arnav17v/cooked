"""Personalized interview questions — latest completed analysis."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import optional_clerk_subject
from app.db.session import get_session
from app.models.analysis import Analysis
from app.models.question import Question
from app.services.users.access import require_resume_readable

router = APIRouter(prefix="/resume", tags=["questions"])


def _normalize_bucket(b: str) -> str:
    low = (b or "").strip().lower()
    if low == "bullet":
        return "from_resume"
    return low if low in ("from_resume", "gap") else "from_resume"


@router.get("/{resume_id}/questions")
async def get_questions(
    resume_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    await require_resume_readable(session, resume_id, clerk_subject)
    a_stmt = (
        select(Analysis)
        .where(Analysis.resume_id == resume_id, Analysis.status == "done")
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    analysis = (await session.execute(a_stmt)).scalar_one_or_none()
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis yet",
        )

    bd = analysis.score_breakdown or {}
    iq = analysis.interview_questions
    if isinstance(iq, list) and len(iq) > 0:
        return {
            "questions": [
                {
                    "question": q.get("question") if isinstance(q, dict) else "",
                    "category": q.get("category", "interview") if isinstance(q, dict) else "interview",
                    "source_bullet": q.get("source_bullet") if isinstance(q, dict) else None,
                    "difficulty": q.get("difficulty", "Medium") if isinstance(q, dict) else "Medium",
                    "bucket": _normalize_bucket(str(q.get("bucket", ""))),
                }
                for q in iq
                if isinstance(q, dict)
            ],
            "share_slug": analysis.share_slug,
            "degraded": bool(bd.get("questions_degraded")),
        }

    q_stmt = select(Question).where(Question.analysis_id == analysis.id).order_by(Question.id)
    rows = (await session.execute(q_stmt)).scalars().all()

    return {
        "questions": [
            {
                "question": q.question,
                "category": q.category,
                "source_bullet": q.source_bullet,
                "difficulty": q.difficulty,
                "bucket": _normalize_bucket(q.question_bucket),
            }
            for q in rows
        ],
        "share_slug": analysis.share_slug,
        "degraded": bool(bd.get("questions_degraded")),
    }
