"""Read-side analysis endpoints — latest completed roast per resume."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import optional_clerk_subject
from app.db.session import get_session
from app.models.analysis import Analysis
from app.models.resume import Resume
from app.models.user import User
from app.schemas.interview_quiz_scores import normalize_interview_quiz_scores
from app.services.llm.errors import RecoverableLLMError
from app.services.resume.indepth_analyzer import generate_indepth_analysis, persist_indepth
from app.services.resume.score_dimensions import (
    derive_dimensions_from_total,
    dimensions_from_breakdown,
    public_dimensions_payload,
    total_from_dimensions,
)
from app.services.users.access import require_resume_readable
from app.services.users.entitlements import UPGRADE_URL, assert_can_generate_indepth, is_pro

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


async def _get_analysis_for_resume(
    session: AsyncSession,
    resume_id: uuid.UUID,
    analysis_id: uuid.UUID,
) -> tuple[Analysis | None, Resume | None]:
    analysis = await session.get(Analysis, analysis_id)
    if analysis is None or analysis.resume_id != resume_id:
        return None, None
    resume = await session.get(Resume, resume_id)
    return analysis, resume


def _indepth_response(analysis: Analysis) -> dict[str, object]:
    generated_at = analysis.indepth_generated_at
    ts = generated_at.isoformat() if isinstance(generated_at, datetime) else None
    payload = analysis.indepth_analysis
    degraded = bool(isinstance(payload, dict) and payload.get("analyze_degraded"))
    return {
        "status": "ready",
        "analysis_id": str(analysis.id),
        "indepth_analysis": payload,
        "indepth_generated_at": ts,
        "degraded": degraded,
    }


class InDepthGenerateBody(BaseModel):
    job_description: str | None = Field(default=None, max_length=12000)
    regenerate: bool = False


@router.get("/{resume_id}/indepth")
async def get_indepth(
    resume_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    resume = await require_resume_readable(session, resume_id, clerk_subject)
    owner = await session.get(User, resume.user_id)
    if not is_pro(owner):
        return {"status": "locked", "upgrade_url": UPGRADE_URL}
    row, _ = await _latest_done_with_resume(session, resume_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis yet",
        )
    if not row.indepth_analysis:
        return {
            "status": "not_generated",
            "analysis_id": str(row.id),
        }
    return _indepth_response(row)


@router.post("/{resume_id}/analysis/{analysis_id}/indepth")
async def post_indepth(
    resume_id: uuid.UUID,
    analysis_id: uuid.UUID,
    body: InDepthGenerateBody | None = None,
    regenerate: bool = Query(False),
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    await require_resume_readable(session, resume_id, clerk_subject)
    analysis, resume = await _get_analysis_for_resume(session, resume_id, analysis_id)
    if analysis is None or resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    if analysis.status != "done":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Analysis not complete yet",
        )

    owner = await session.get(User, resume.user_id)
    want_regenerate = regenerate or bool(body and body.regenerate)
    if analysis.indepth_analysis and not want_regenerate:
        assert_can_generate_indepth(owner)
        return _indepth_response(analysis)

    assert_can_generate_indepth(owner)
    jd = body.job_description if body else None
    try:
        out, degraded = await generate_indepth_analysis(
            session,
            analysis,
            resume,
            job_description=jd,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except RecoverableLLMError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e) if len(str(e)) < 500 else "In-depth analysis temporarily unavailable.",
        ) from e

    persist_indepth(analysis, out, degraded=degraded)
    await session.commit()
    return _indepth_response(analysis)


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
    dims = dimensions_from_breakdown(bd)
    if row.cooked_score is not None and total_from_dimensions(dims) == 0:
        dims = derive_dimensions_from_total(row.cooked_score)
    in_depth = (bd.get("ai_in_depth_review") or "").strip()
    raw_text = (resume.raw_text or "").strip()
    preview = " ".join(raw_text.split())
    if len(preview) > 1200:
        preview = preview[:1199] + "…"
    return {
        "analysis_id": str(row.id),
        "indepth_ready": bool(row.indepth_analysis),
        "cooked_score": row.cooked_score,
        "score": row.cooked_score,
        "heat_label": bd.get("heat_label"),
        "headline": one,
        "one_liner": one,
        "role": resume.target_role,
        "score_breakdown": bd,
        "score_dimensions": public_dimensions_payload(dims),
        "ai_in_depth_review": in_depth or None,
        "share_slug": row.share_slug,
        "degraded": bool(bd.get("analyze_degraded") or bd.get("degraded")),
        "interview_quiz_scores": normalize_interview_quiz_scores(resume.interview_quiz_scores),
        "resume_has_pdf": bool(resume.file_url),
        "resume_text_preview": preview or None,
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
    insights = row.red_flags or []
    return {
        "red_flags": insights,
        "flags": insights,
        "ai_insights": insights,
        "rewritten_bullets": row.rewritten_bullets or [],
        "share_slug": row.share_slug,
    }
