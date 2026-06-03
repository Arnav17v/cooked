"""Public share payload — slug only, no internal UUIDs. Flags/questions stay private."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.analysis import Analysis
from app.models.resume import Resume
from app.services.resume.score_dimensions import (
    derive_dimensions_from_total,
    dimensions_from_breakdown,
    public_dimensions_payload,
    total_from_dimensions,
)

router = APIRouter(prefix="/share", tags=["share"])


@router.get("/{slug}")
async def get_share(
    slug: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    stmt = (
        select(Analysis, Resume)
        .join(Resume, Analysis.resume_id == Resume.id)
        .where(Analysis.share_slug == slug, Analysis.status == "done")
        .limit(1)
    )
    row = (await session.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share not found")

    analysis, resume = row
    bd = analysis.score_breakdown or {}
    one = analysis.one_liner or bd.get("one_liner") or bd.get("headline")
    dims = dimensions_from_breakdown(bd)
    if analysis.cooked_score is not None and total_from_dimensions(dims) == 0:
        dims = derive_dimensions_from_total(analysis.cooked_score)
    insights = analysis.red_flags or []
    preview_insights = []
    for item in insights[:2]:
        if isinstance(item, dict) and item.get("issue"):
            preview_insights.append(
                {
                    "issue": str(item.get("issue", ""))[:280],
                    "suggested_rewrite": str(item.get("suggested_rewrite", ""))[:280],
                }
            )
    return {
        "share_slug": analysis.share_slug,
        "role": resume.target_role,
        "target_role": resume.target_role,
        "score": analysis.cooked_score,
        "cooked_score": analysis.cooked_score,
        "heat_label": bd.get("heat_label"),
        "one_liner": one,
        "headline": one,
        "score_dimensions": public_dimensions_payload(dims),
        "ai_insights_preview": preview_insights,
        "degraded": bool(bd.get("analyze_degraded") or bd.get("degraded")),
    }
