"""Lemon Squeezy webhook verification + Pro unlock."""

from __future__ import annotations

import hashlib
import hmac
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.purchase import Purchase
from app.models.user import User

log = logging.getLogger(__name__)

_UNLOCK_EVENTS = frozenset(
    {
        "order_created",
        "subscription_created",
        "subscription_payment_success",
        "subscription_resumed",
    }
)

# Events that should revoke Pro access
_LOCK_EVENTS = frozenset(
    {
        "subscription_cancelled",
        "subscription_expired",
        "subscription_payment_failed",
        "subscription_paused",
    }
)


def verify_signature(payload: bytes, signature: str | None, secret: str) -> bool:
    if not signature or not secret:
        return False
    digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)


def _custom_data(payload: dict[str, Any]) -> dict[str, Any]:
    meta = payload.get("meta")
    if isinstance(meta, dict):
        custom = meta.get("custom_data")
        if isinstance(custom, dict):
            return custom
    data = payload.get("data")
    if isinstance(data, dict):
        attrs = data.get("attributes")
        if isinstance(attrs, dict):
            custom = attrs.get("custom_data")
            if isinstance(custom, dict):
                return custom
    return {}


def _user_email(payload: dict[str, Any]) -> str | None:
    data = payload.get("data")
    if not isinstance(data, dict):
        return None
    attrs = data.get("attributes")
    if not isinstance(attrs, dict):
        return None
    email = attrs.get("user_email") or attrs.get("customer_email")
    if isinstance(email, str) and email.strip():
        return email.strip().lower()
    return None


def _provider_ids(payload: dict[str, Any]) -> tuple[str | None, str | None]:
    data = payload.get("data")
    if not isinstance(data, dict):
        return None, None
    order_id = str(data.get("id")) if data.get("id") is not None else None
    attrs = data.get("attributes")
    payment_id = None
    if isinstance(attrs, dict):
        for key in ("order_id", "subscription_id", "identifier"):
            val = attrs.get(key)
            if val is not None:
                payment_id = str(val)
                break
    return order_id, payment_id


async def _resolve_user(session: AsyncSession, payload: dict[str, Any]) -> User | None:
    custom = _custom_data(payload)
    clerk_subject = custom.get("clerk_subject")
    if isinstance(clerk_subject, str) and clerk_subject.strip():
        return await session.scalar(
            select(User).where(User.clerk_subject == clerk_subject.strip()).limit(1)
        )
    email = _user_email(payload)
    if email:
        return await session.scalar(select(User).where(User.email == email).limit(1))
    return None


async def handle_webhook(session: AsyncSession, payload: dict[str, Any]) -> dict[str, str]:
    meta = payload.get("meta")
    event_name = ""
    if isinstance(meta, dict):
        raw = meta.get("event_name")
        if isinstance(raw, str):
            event_name = raw.strip()

    if event_name in _UNLOCK_EVENTS:
        user = await _resolve_user(session, payload)
        if user is None:
            log.warning("lemon webhook: no user for event=%s", event_name)
            return {"status": "user_not_found", "event": event_name}

        settings = get_settings()
        now = datetime.now(UTC)
        user.plan = "pro"
        if user.pro_unlocked_at is None:
            user.pro_unlocked_at = now

        order_id, payment_id = _provider_ids(payload)
        purchase = Purchase(
            id=uuid.uuid4(),
            user_id=user.id,
            provider="lemonsqueezy",
            provider_order_id=order_id,
            provider_payment_id=payment_id,
            amount_cents=settings.pro_monthly_price_cents,
            currency="usd",
            product_sku="pro_monthly",
            status="paid",
            paid_at=now,
        )
        session.add(purchase)
        await session.commit()

        log.info("lemon webhook: unlocked pro for user=%s event=%s", user.id, event_name)
        return {"status": "unlocked", "event": event_name, "user_id": str(user.id)}

    if event_name in _LOCK_EVENTS:
        user = await _resolve_user(session, payload)
        if user is None:
            log.warning("lemon webhook: no user for lock event=%s", event_name)
            return {"status": "user_not_found", "event": event_name}

        user.plan = "free"
        user.pro_unlocked_at = None
        await session.commit()

        log.info("lemon webhook: downgraded to free for user=%s event=%s", user.id, event_name)
        return {"status": "downgraded", "event": event_name, "user_id": str(user.id)}

    return {"status": "ignored", "event": event_name or "unknown"}
