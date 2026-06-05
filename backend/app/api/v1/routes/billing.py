"""Billing and entitlements — Stripe stubs; ``GET /me/entitlements`` live."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import require_clerk_subject
from app.core.config import get_settings
from app.db.session import get_session
from app.models.prep_plan import PrepPlan, PrepPlanStatus
from app.models.user import User
from app.services.users.clerk_user import require_user_for_clerk
from app.services.users.entitlements import features_payload, get_usage, is_pro

router = APIRouter(tags=["billing"])


async def _active_plan_for_user(session: AsyncSession, user_id: uuid.UUID) -> PrepPlan | None:
    return await session.scalar(
        select(PrepPlan)
        .where(PrepPlan.user_id == user_id, PrepPlan.status == PrepPlanStatus.active.value)
        .order_by(PrepPlan.updated_at.desc())
        .limit(1)
    )


@router.get("/me/entitlements")
async def get_entitlements(
    resume_id: uuid.UUID | None = Query(default=None),
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    user = await require_user_for_clerk(session, clerk_subject)
    settings = get_settings()
    plan = await _active_plan_for_user(session, user.id)
    usage = await get_usage(session, user, resume_id=resume_id, plan=plan)
    return {
        "plan": "pro" if is_pro(user) else "free",
        "pro_unlocked_at": (
            user.pro_unlocked_at.isoformat() if user.pro_unlocked_at else None
        ),
        "usage": usage,
        "features": features_payload(user),
        "pricing": {
            "pro_monthly_usd": settings.pro_monthly_price_cents // 100,
            "pro_monthly_cents": settings.pro_monthly_price_cents,
        },
    }


@router.post("/billing/create-order")
async def billing_create_order() -> None:
    # TODO: implement after payment provider decision (Stripe subscription)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Payment coming soon",
    )


@router.post("/billing/webhook")
async def billing_webhook() -> None:
    # TODO: Stripe webhook — verify signature, set users.plan = pro
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Payment webhook not configured",
    )


@router.post("/billing/verify")
async def billing_verify() -> None:
    # TODO: client-side verify after Stripe Checkout — do not trust without provider confirmation
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Payment verification not configured",
    )
