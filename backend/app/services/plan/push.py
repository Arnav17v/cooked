"""Web Push delivery for prep plan reminders."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import SessionFactory
from app.models.push_subscription import PushSubscription
from app.services.plan.service import get_active_plans_for_push

log = logging.getLogger(__name__)


def _vapid_configured() -> bool:
    s = get_settings()
    return bool(
        s.plan_push_enabled
        and (s.vapid_public_key or "").strip()
        and (s.vapid_private_key or "").strip()
        and (s.vapid_email or "").strip()
    )


async def send_plan_morning_notifications() -> None:
    if not _vapid_configured():
        log.debug("plan push: skipped (VAPID not configured)")
        return

    today = datetime.now(UTC).date()
    sent = 0
    failed = 0

    async with SessionFactory() as db:
        rows = await get_active_plans_for_push(db, on_date=today)
        if not rows:
            return

        try:
            from pywebpush import WebPushException, webpush
        except ImportError:
            log.warning("plan push: pywebpush not installed")
            return

        settings = get_settings()
        vapid_claims = {"sub": settings.vapid_email.strip()}

        for plan, day in rows:
            subs = (
                await db.scalars(
                    select(PushSubscription).where(PushSubscription.user_id == plan.user_id)
                )
            ).all()
            if not subs:
                continue

            title = f"Day {day.day_number} — {plan.company_name} prep"
            body = f"{day.focus_area} today. Ready?"
            payload = json.dumps(
                {
                    "title": title,
                    "body": body,
                    "url": "/plan",
                }
            )

            for sub in subs:
                try:
                    webpush(
                        subscription_info=sub.subscription_json,
                        data=payload,
                        vapid_private_key=settings.vapid_private_key.strip(),
                        vapid_claims=vapid_claims,
                    )
                    sent += 1
                except WebPushException as exc:
                    failed += 1
                    if exc.response is not None and exc.response.status_code in (404, 410):
                        await db.delete(sub)
                except Exception:
                    failed += 1
                    log.exception("plan push: send failed for subscription %s", sub.id)

        await db.commit()

    log.info("plan push: sent=%s failed=%s", sent, failed)
