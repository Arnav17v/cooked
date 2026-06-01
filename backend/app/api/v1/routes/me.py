"""Authenticated session surfaces — Clerk-linked user only."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import require_clerk_subject
from app.db.session import get_session
from app.models.analysis import Analysis
from app.models.resume import Resume
from app.models.user import User

router = APIRouter(prefix="/me", tags=["me"])


class MyRoastItem(BaseModel):
    resume_id: str
    target_role: str
    resume_created_at: datetime
    analysis_id: str | None = None
    analysis_status: str | None = None
    share_slug: str | None = None
    cooked_score: int | None = None


class MyRoastsResponse(BaseModel):
    items: list[MyRoastItem]


def _latest_analysis_by_resume(analyses: list[Analysis]) -> dict[uuid.UUID, Analysis]:
    latest: dict[uuid.UUID, Analysis] = {}
    for a in analyses:
        prev = latest.get(a.resume_id)
        if prev is None or a.created_at > prev.created_at:
            latest[a.resume_id] = a
    return latest


@router.get("/roasts", response_model=MyRoastsResponse)
async def list_my_roasts(
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> MyRoastsResponse:
    stmt = select(User).where(User.clerk_subject == clerk_subject).limit(1)
    owner = await session.scalar(stmt)
    if owner is None:
        return MyRoastsResponse(items=[])

    r_stmt = (
        select(Resume)
        .where(Resume.user_id == owner.id)
        .order_by(Resume.created_at.desc())
        .limit(40)
    )
    resumes = (await session.scalars(r_stmt)).all()
    if not resumes:
        return MyRoastsResponse(items=[])

    resume_ids = [r.id for r in resumes]
    a_stmt = select(Analysis).where(Analysis.resume_id.in_(resume_ids))
    analyses = (await session.scalars(a_stmt)).all()
    latest_by_resume = _latest_analysis_by_resume(list(analyses))

    items: list[MyRoastItem] = []
    for r in resumes:
        a = latest_by_resume.get(r.id)
        items.append(
            MyRoastItem(
                resume_id=str(r.id),
                target_role=r.target_role,
                resume_created_at=r.created_at,
                analysis_id=str(a.id) if a else None,
                analysis_status=a.status if a else None,
                share_slug=a.share_slug if a else None,
                cooked_score=a.cooked_score if a else None,
            ),
        )

    return MyRoastsResponse(items=items)
