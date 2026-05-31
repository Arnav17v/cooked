"""Seminar CRUD/read endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session
from app.models.seminar import Seminar, SeminarStatus

router = APIRouter(prefix="/seminar", tags=["seminar"])


class SeminarIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=20_000)
    host_name: str = Field(min_length=1, max_length=120)
    host_role: str = Field(min_length=1, max_length=120)
    host_company: str = Field(min_length=1, max_length=120)
    host_linkedin: str = Field(min_length=1, max_length=500)
    host_image_url: str | None = Field(default=None, max_length=1000)
    date_time: datetime
    duration_minutes: int = Field(ge=1, le=24 * 60)
    venue: str = Field(min_length=1, max_length=200)
    spots_total: int = Field(ge=1, le=10000)
    spots_remaining: int = Field(ge=0, le=10000)
    price_inr: int = Field(ge=0, le=1_000_000)
    razorpay_link: str = Field(min_length=1, max_length=1000)
    banner_image_url: str | None = Field(default=None, max_length=1000)
    tags: list[str] = Field(default_factory=list)
    status: SeminarStatus = SeminarStatus.draft


class SeminarPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=20_000)
    host_name: str | None = Field(default=None, min_length=1, max_length=120)
    host_role: str | None = Field(default=None, min_length=1, max_length=120)
    host_company: str | None = Field(default=None, min_length=1, max_length=120)
    host_linkedin: str | None = Field(default=None, min_length=1, max_length=500)
    host_image_url: str | None = Field(default=None, max_length=1000)
    date_time: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=24 * 60)
    venue: str | None = Field(default=None, min_length=1, max_length=200)
    spots_total: int | None = Field(default=None, ge=1, le=10000)
    spots_remaining: int | None = Field(default=None, ge=0, le=10000)
    price_inr: int | None = Field(default=None, ge=0, le=1_000_000)
    razorpay_link: str | None = Field(default=None, min_length=1, max_length=1000)
    banner_image_url: str | None = Field(default=None, max_length=1000)
    tags: list[str] | None = None
    status: SeminarStatus | None = None


def _require_dev() -> None:
    if not get_settings().dev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def _normalize_tags(tags: list[str]) -> list[str]:
    out: list[str] = []
    for t in tags:
        clean = t.strip()
        if clean:
            out.append(clean[:64])
    return out[:20]


def _to_dict(s: Seminar) -> dict[str, Any]:
    return {
        "id": str(s.id),
        "title": s.title,
        "description": s.description,
        "host_name": s.host_name,
        "host_role": s.host_role,
        "host_company": s.host_company,
        "host_linkedin": s.host_linkedin,
        "host_image_url": s.host_image_url,
        "date_time": s.date_time.isoformat(),
        "duration_minutes": s.duration_minutes,
        "venue": s.venue,
        "spots_total": s.spots_total,
        "spots_remaining": s.spots_remaining,
        "price_inr": s.price_inr,
        "razorpay_link": s.razorpay_link,
        "banner_image_url": s.banner_image_url,
        "tags": s.tags or [],
        "status": s.status.value if isinstance(s.status, SeminarStatus) else str(s.status),
        "created_at": s.created_at.isoformat(),
    }


@router.post("")
async def create_seminar(
    body: SeminarIn,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    _require_dev()
    row = Seminar(
        title=body.title.strip(),
        description=body.description.strip(),
        host_name=body.host_name.strip(),
        host_role=body.host_role.strip(),
        host_company=body.host_company.strip(),
        host_linkedin=body.host_linkedin.strip(),
        host_image_url=(body.host_image_url or "").strip() or None,
        date_time=body.date_time,
        duration_minutes=body.duration_minutes,
        venue=body.venue.strip(),
        spots_total=body.spots_total,
        spots_remaining=body.spots_remaining,
        price_inr=body.price_inr,
        razorpay_link=body.razorpay_link.strip(),
        banner_image_url=(body.banner_image_url or "").strip() or None,
        tags=_normalize_tags(body.tags),
        status=body.status,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return {"seminar": _to_dict(row)}


@router.patch("/{seminar_id}")
async def patch_seminar(
    seminar_id: uuid.UUID,
    body: SeminarPatch,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    _require_dev()
    row = await session.get(Seminar, seminar_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")

    payload = body.model_dump(exclude_unset=True)
    for key, value in payload.items():
        if key in {"title", "description", "host_name", "host_role", "host_company", "host_linkedin", "venue", "razorpay_link"} and isinstance(value, str):
            setattr(row, key, value.strip())
        elif key in {"host_image_url", "banner_image_url"}:
            setattr(row, key, (value or "").strip() or None)
        elif key == "tags" and isinstance(value, list):
            setattr(row, key, _normalize_tags(value))
        else:
            setattr(row, key, value)

    await session.commit()
    await session.refresh(row)
    return {"seminar": _to_dict(row)}


_PUBLIC_STATUSES = (SeminarStatus.live, SeminarStatus.full, SeminarStatus.completed)


@router.get("/public")
async def list_public_seminars(
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    stmt = (
        select(Seminar)
        .where(Seminar.status.in_(_PUBLIC_STATUSES))
        .order_by(Seminar.date_time.asc())
    )
    rows = (await session.execute(stmt)).scalars().all()
    return {"sessions": [_to_dict(r) for r in rows]}


@router.get("/live")
async def get_live_seminar(
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    stmt = (
        select(Seminar)
        .where(Seminar.status == SeminarStatus.live)
        .order_by(Seminar.date_time.asc())
        .limit(1)
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    return {"seminar": _to_dict(row) if row else None}


@router.get("/all")
async def get_all_seminars(
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    _require_dev()
    stmt = select(Seminar).order_by(Seminar.created_at.desc())
    rows = (await session.execute(stmt)).scalars().all()
    return {"sessions": [_to_dict(r) for r in rows]}


@router.get("/{seminar_id}")
async def get_public_seminar(
    seminar_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    row = await session.get(Seminar, seminar_id)
    if row is None or row.status == SeminarStatus.draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seminar not found")
    return {"seminar": _to_dict(row)}
