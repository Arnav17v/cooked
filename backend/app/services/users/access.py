"""Resume reads/writes gated by Clerk `sub` when the client sends a Bearer token."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resume import Resume
from app.models.user import User


async def assert_resume_owned_if_authenticated(
    session: AsyncSession,
    resume: Resume,
    clerk_subject: str | None,
) -> None:
    """Anonymous clients skip checks; Bearer clients must match the resume owner."""

    if clerk_subject is None:
        return
    owner = await session.get(User, resume.user_id)
    if owner is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="resume not found",
        )
    if owner.clerk_subject != clerk_subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="resume not found",
        )


async def require_resume_readable(
    session: AsyncSession,
    resume_id: uuid.UUID,
    clerk_subject: str | None,
) -> Resume:
    resume = await session.get(Resume, resume_id)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="resume not found")
    await assert_resume_owned_if_authenticated(session, resume, clerk_subject)
    return resume
