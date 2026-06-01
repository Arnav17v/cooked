"""Resolve Clerk subject to internal User row."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def require_user_for_clerk(
    session: AsyncSession,
    clerk_subject: str,
) -> User:
    owner = await session.scalar(
        select(User).where(User.clerk_subject == clerk_subject).limit(1)
    )
    if owner is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in required",
        )
    return owner
