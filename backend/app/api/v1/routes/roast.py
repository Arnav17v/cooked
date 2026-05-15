"""Flat roast API (`/score`, `/flags`, …) + `POST /analyze` with body — spec paths under `/api/v1/`."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import optional_clerk_subject
from app.api.v1.routes.resume import enqueue_analysis_for_resume
from app.db.session import get_session
from app.models.analysis import Analysis
from app.models.resume import Resume
from app.schemas.interview_quiz_scores import normalize_interview_quiz_scores

router = APIRouter(tags=["roast"])


class AnalyzeRequest(BaseModel):
    resume_id: uuid.UUID
    role: str = Field(..., min_length=1, max_length=128)


@router.post("/analyze")
async def post_analyze(
    body: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, str]:
    resume = await session.get(Resume, body.resume_id)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="resume not found")

    resume.target_role = body.role.strip()[:128]
    await session.commit()

    return await enqueue_analysis_for_resume(
        body.resume_id, background_tasks, session, clerk_subject
    )


@router.get("/score/{resume_id}")
async def get_score_flat(
    resume_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    row, resume = await _latest_done_with_resume(session, resume_id)
    if row is None or resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis yet",
        )
    bd = row.score_breakdown or {}
    return {
        "score": row.cooked_score,
        "heat_label": bd.get("heat_label"),
        "one_liner": row.one_liner or bd.get("one_liner") or bd.get("headline"),
        "role": resume.target_role,
        "share_slug": row.share_slug,
        "degraded": bool(bd.get("analyze_degraded") or bd.get("degraded")),
        "interview_quiz_scores": normalize_interview_quiz_scores(resume.interview_quiz_scores),
    }


@router.get("/flags/{resume_id}")
async def get_flags_flat(
    resume_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    row, _ = await _latest_done_with_resume(session, resume_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis yet",
        )
    return {"flags": row.red_flags or []}


@router.get("/questions/{resume_id}")
async def get_questions_flat(
    resume_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    row, _ = await _latest_done_with_resume(session, resume_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis yet",
        )
    iq = row.interview_questions
    if isinstance(iq, list) and iq:
        return {"questions": iq}
    return {"questions": []}


@router.get("/sections/{resume_id}")
async def get_sections_flat(
    resume_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    row, _ = await _latest_done_with_resume(session, resume_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis yet",
        )
    sv = row.section_verdicts
    if isinstance(sv, dict):
        return {"section_verdicts": sv}
    return {"section_verdicts": {}}


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
