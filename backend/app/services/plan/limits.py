"""Daily caps for prep plan LLM operations."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.plan_day import PlanDay
from app.models.prep_plan import PrepPlan


def _utc_today() -> date:
    return datetime.now(UTC).date()


async def count_plan_generates_today(session: AsyncSession, user_id: uuid.UUID) -> int:
    today = _utc_today()
    stmt = (
        select(func.count())
        .select_from(PrepPlan)
        .where(
            PrepPlan.user_id == user_id,
            func.date(PrepPlan.created_at) == today,
        )
    )
    return int((await session.execute(stmt)).scalar_one())


async def count_plan_modifies_today(session: AsyncSession, user_id: uuid.UUID) -> int:
    today = _utc_today()
    min_delta = timedelta(seconds=5)
    stmt = (
        select(func.count())
        .select_from(PrepPlan)
        .where(
            PrepPlan.user_id == user_id,
            func.date(PrepPlan.updated_at) == today,
            PrepPlan.updated_at > PrepPlan.created_at + min_delta,
        )
    )
    return int((await session.execute(stmt)).scalar_one())


async def count_day_module_generations_today(session: AsyncSession, user_id: uuid.UUID) -> int:
    today = _utc_today()
    stmt = (
        select(func.count())
        .select_from(PlanDay)
        .join(PrepPlan, PrepPlan.id == PlanDay.plan_id)
        .where(
            PrepPlan.user_id == user_id,
            PlanDay.modules_generated_at.isnot(None),
            func.date(PlanDay.modules_generated_at) == today,
        )
    )
    return int((await session.execute(stmt)).scalar_one())


async def assert_can_generate_plan(session: AsyncSession, user_id: uuid.UUID) -> None:
    settings = get_settings()
    if settings.dev:
        return
    cap = settings.daily_plan_generate_cap
    n = await count_plan_generates_today(session, user_id)
    if n >= cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily plan generation limit reached ({cap} per day) — try again tomorrow.",
        )


async def assert_can_modify_plan(session: AsyncSession, user_id: uuid.UUID) -> None:
    settings = get_settings()
    if settings.dev:
        return
    cap = settings.daily_plan_modify_cap
    n = await count_plan_modifies_today(session, user_id)
    if n >= cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily plan modification limit reached ({cap} per day) — try again tomorrow.",
        )


async def assert_can_generate_day_modules(session: AsyncSession, user_id: uuid.UUID) -> None:
    settings = get_settings()
    if settings.dev:
        return
    cap = settings.daily_plan_day_module_cap
    n = await count_day_module_generations_today(session, user_id)
    if n >= cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily plan module generation limit reached ({cap} per day) — try again tomorrow.",
        )
