"""Billing and entitlements — Lemon Squeezy checkout + webhook."""

from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import require_clerk_subject
from app.core.config import get_settings
from app.db.session import get_session
from app.models.prep_plan import PrepPlan, PrepPlanStatus
from app.services.billing.lemon_squeezy import handle_webhook, verify_signature
from app.services.users.clerk_user import require_user_for_clerk
from app.services.users.entitlements import features_payload, get_usage, is_pro

router = APIRouter(tags=["billing"])
log = logging.getLogger(__name__)


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
            "checkout_url": settings.lemon_squeezy_checkout_url,
            "provider": settings.payment_provider,
        },
    }


@router.post("/billing/webhook")
async def billing_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, str]:
    settings = get_settings()
    secret = (settings.lemon_squeezy_webhook_secret or "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Lemon Squeezy webhook secret not configured",
        )

    body = await request.body()
    signature = request.headers.get("X-Signature")
    if not verify_signature(body, signature, secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")

    try:
        return await handle_webhook(session, payload)
    except Exception:
        log.exception("lemon webhook handler failed")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed",
        ) from None


@router.post("/billing/create-order")
async def billing_create_order() -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Use Lemon Squeezy checkout URL",
    )


@router.post("/billing/verify")
async def billing_verify() -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Pro unlocks via Lemon Squeezy webhook",
    )
