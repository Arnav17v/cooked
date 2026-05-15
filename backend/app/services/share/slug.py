"""Helpers for public `share_slug` allocation."""

from __future__ import annotations

import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis


async def allocate_share_slug(session: AsyncSession) -> str:
    """Random URL-safe slug; retries on rare collisions."""
    for _ in range(24):
        slug = secrets.token_urlsafe(9)[:16]
        exists = await session.scalar(select(Analysis.id).where(Analysis.share_slug == slug))
        if exists is None:
            return slug
    raise RuntimeError("could not allocate a unique share_slug")
