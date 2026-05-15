"""User rows for uploads: anonymous blob per session, or stable Clerk-linked account."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


def _normalize_anonymous_client_key(raw: str) -> str | None:
    try:
        return str(uuid.UUID((raw or "").strip()))
    except ValueError:
        return None


async def create_anonymous_upload_user(session: AsyncSession) -> User:
    user = User(
        email=None,
        clerk_subject=None,
        anonymous_client_key=None,
        plan="free",
        analyses_today=0,
        last_analysis_date=None,
    )
    session.add(user)
    await session.flush()
    return user


async def resolve_upload_user(
    session: AsyncSession,
    clerk_subject: str | None,
    *,
    anonymous_client_key: str | None = None,
) -> User:
    """Signed-in uploads attach to `users.clerk_subject`.

    Anonymous uploads reuse `users` by `X-Cooked-Anonymous-Id` (UUID) when valid;
    otherwise each upload still gets a fresh disposable row (legacy).
    """

    if clerk_subject:
        stmt = select(User).where(User.clerk_subject == clerk_subject).limit(1)
        found = await session.scalar(stmt)
        if found:
            return found
        user = User(
            email=None,
            clerk_subject=clerk_subject,
            anonymous_client_key=None,
            plan="free",
            analyses_today=0,
            last_analysis_date=None,
        )
        session.add(user)
        await session.flush()
        return user

    raw = (anonymous_client_key or "").strip()
    key = _normalize_anonymous_client_key(raw)
    if key:
        stmt = select(User).where(User.anonymous_client_key == key).limit(1)
        found = await session.scalar(stmt)
        if found:
            return found
        user = User(
            email=None,
            clerk_subject=None,
            anonymous_client_key=key,
            plan="free",
            analyses_today=0,
            last_analysis_date=None,
        )
        session.add(user)
        await session.flush()
        return user

    return await create_anonymous_upload_user(session)


async def create_upload_user(session: AsyncSession) -> User:
    """Backward-compatible name — anonymous session user."""

    return await create_anonymous_upload_user(session)
