"""Freemium entitlements — server-side gates before LLM work or sensitive reads."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.interview_session import InterviewSession
from app.models.prep_plan import PrepPlan, PrepPlanStatus
from app.models.resume import Resume
from app.models.user import User

UPGRADE_URL = "/upgrade"


def is_pro(user: User | None) -> bool:
    settings = get_settings()
    if settings.dev:
        return True
    if user is None:
        return False
    return (user.plan or "free").strip().lower() == "pro"


def raise_payment_required(
    *,
    code: str,
    message: str,
    usage: dict[str, Any] | None = None,
) -> None:
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail={
            "code": code,
            "message": message,
            "usage": usage or {},
            "upgrade_url": UPGRADE_URL,
        },
    )


def plan_access_expires_at(plan: PrepPlan) -> datetime | None:
    """When free plan player access ends; ``None`` for unlimited (Pro)."""
    settings = get_settings()
    created = plan.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=UTC)
    deploy_at = settings.entitlements_deploy_at
    if deploy_at.tzinfo is None:
        deploy_at = deploy_at.replace(tzinfo=UTC)
    anchor = created if created >= deploy_at else deploy_at
    return anchor + timedelta(hours=settings.free_plan_access_hours)


def plan_hours_remaining(plan: PrepPlan) -> float | None:
    expires = plan_access_expires_at(plan)
    if expires is None:
        return None
    now = datetime.now(UTC)
    delta = expires - now
    return max(0.0, delta.total_seconds() / 3600.0)


def is_plan_execution_locked(user: User, plan: PrepPlan) -> bool:
    if is_pro(user):
        return False
    expires = plan_access_expires_at(plan)
    if expires is None:
        return False
    return datetime.now(UTC) >= expires


def plan_access_payload(user: User, plan: PrepPlan) -> dict[str, Any]:
    if is_pro(user):
        return {
            "execution_locked": False,
            "locked_reason": None,
            "locked_at": None,
            "unlock_at": None,
            "free_access_expires_at": None,
            "hours_remaining": None,
        }
    expires = plan_access_expires_at(plan)
    locked = is_plan_execution_locked(user, plan)
    hours = plan_hours_remaining(plan)
    return {
        "execution_locked": locked,
        "locked_reason": "plan_expired" if locked else None,
        "locked_at": expires.isoformat() if locked and expires else None,
        "unlock_at": None,
        "free_access_expires_at": expires.isoformat() if expires else None,
        "hours_remaining": round(hours, 2) if hours is not None else None,
    }


async def count_user_prep_plans(session: AsyncSession, user_id: uuid.UUID) -> int:
    """Non-abandoned prep plans (active or completed) count toward the free cap."""
    stmt = (
        select(func.count())
        .select_from(PrepPlan)
        .where(
            PrepPlan.user_id == user_id,
            PrepPlan.status != PrepPlanStatus.abandoned.value,
        )
    )
    return int((await session.execute(stmt)).scalar_one())


async def count_user_resumes(session: AsyncSession, user_id: uuid.UUID) -> int:
    stmt = select(func.count()).select_from(Resume).where(Resume.user_id == user_id)
    return int((await session.execute(stmt)).scalar_one())


async def count_completed_quizzes_for_resume(
    session: AsyncSession,
    resume_id: uuid.UUID,
) -> int:
    settings = get_settings()
    enforced_from = settings.quiz_cap_enforced_from
    if enforced_from.tzinfo is None:
        enforced_from = enforced_from.replace(tzinfo=UTC)
    stmt = (
        select(func.count())
        .select_from(InterviewSession)
        .where(
            InterviewSession.resume_id == resume_id,
            InterviewSession.completed_at.is_not(None),
            InterviewSession.created_at >= enforced_from,
        )
    )
    return int((await session.execute(stmt)).scalar_one())


async def get_usage(
    session: AsyncSession,
    user: User,
    *,
    resume_id: uuid.UUID | None = None,
    plan: PrepPlan | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    resumes_count = await count_user_resumes(session, user.id)
    quizzes_this_resume = 0
    if resume_id is not None:
        quizzes_this_resume = await count_completed_quizzes_for_resume(session, resume_id)
    plan_hours: float | None = None
    if plan is not None and not is_pro(user):
        plan_hours = plan_hours_remaining(plan)
        if plan_hours is not None:
            plan_hours = round(plan_hours, 2)
    plans_count = await count_user_prep_plans(session, user.id)
    return {
        "resumes_count": resumes_count,
        "resumes_limit": settings.free_max_resumes,
        "quizzes_this_resume": quizzes_this_resume,
        "quizzes_limit": settings.free_max_quizzes_per_resume,
        "plans_count": plans_count,
        "plans_limit": settings.free_max_plans,
        "plan_hours_remaining": plan_hours,
    }


async def assert_can_upload_resume(session: AsyncSession, user: User) -> None:
    if is_pro(user):
        return
    settings = get_settings()
    await session.scalar(select(User).where(User.id == user.id).with_for_update())
    count = await count_user_resumes(session, user.id)
    if count >= settings.free_max_resumes:
        raise_payment_required(
            code="resume_limit_reached",
            message=(
                f"You've uploaded {count}/{settings.free_max_resumes} resumes. "
                "Upgrade to Pro for unlimited uploads."
            ),
            usage={"current": count, "limit": settings.free_max_resumes},
        )


async def assert_can_create_plan(session: AsyncSession, user: User) -> None:
    if is_pro(user):
        return
    settings = get_settings()
    count = await count_user_prep_plans(session, user.id)
    if count >= settings.free_max_plans:
        raise_payment_required(
            code="plan_limit_reached",
            message=(
                f"You already have {count}/{settings.free_max_plans} prep plan"
                f"{'' if settings.free_max_plans == 1 else 's'}. "
                "Upgrade to Pro for unlimited plans."
            ),
            usage={"current": count, "limit": settings.free_max_plans},
        )


def assert_can_generate_indepth(user: User | None) -> None:
    if is_pro(user):
        return
    raise_payment_required(
        code="indepth_locked",
        message="In-Depth Analysis is a Pro feature. Upgrade to unlock.",
        usage={},
    )


async def assert_can_start_quiz(
    session: AsyncSession,
    user_id: uuid.UUID,
    resume_id: uuid.UUID,
) -> None:
    user = await session.get(User, user_id)
    if is_pro(user):
        return
    settings = get_settings()
    count = await count_completed_quizzes_for_resume(session, resume_id)
    if count >= settings.free_max_quizzes_per_resume:
        raise_payment_required(
            code="quiz_limit_reached",
            message=(
                f"You've used {count}/{settings.free_max_quizzes_per_resume} quiz sessions "
                "for this resume. Upgrade to Pro for unlimited practice."
            ),
            usage={
                "current": count,
                "limit": settings.free_max_quizzes_per_resume,
            },
        )


def assert_plan_execution_access(user: User, plan: PrepPlan) -> None:
    if not is_plan_execution_locked(user, plan):
        return
    expires = plan_access_expires_at(plan)
    raise_payment_required(
        code="plan_expired",
        message="Your free plan access has expired. Upgrade to Pro to keep your prep plan.",
        usage={
            "expired_at": expires.isoformat() if expires else None,
        },
    )


def features_payload(user: User) -> dict[str, bool]:
    pro = is_pro(user)
    return {
        "indepth_analysis": pro,
        "unlimited_quizzes": pro,
        "unlimited_resumes": pro,
        "plan_no_expiry": pro,
        "unlimited_plans": pro,
    }
