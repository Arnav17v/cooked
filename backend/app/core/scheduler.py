"""In-process scheduler — APScheduler only. No Redis, no Celery (D-011, D-015, D-017).

Registers the daily ``sweep_old_resume_text`` hook (no-ops unless
``RAW_TEXT_RETENTION_ENABLED``). Wire jobs at startup via ``register_jobs``.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

log = logging.getLogger(__name__)


_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="UTC")
    return _scheduler


def register_jobs(
    *,
    retention_job: Callable[[], Awaitable[None]] | None = None,
    plan_notify_job: Callable[[], Awaitable[None]] | None = None,
) -> None:
    """Attach jobs. Called once from `main.py` on startup.

    Currently registers a single daily retention sweep at 03:17 UTC if a job
    function is provided. The exact hour is arbitrary — picked to avoid
    midnight cron storms.
    """
    scheduler = get_scheduler()

    if retention_job is not None:
        scheduler.add_job(
            retention_job,
            trigger=CronTrigger(hour=3, minute=17),
            id="resume_retention_sweep",
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=3600,
        )
        log.info("scheduler: registered resume_retention_sweep daily at 03:17 UTC")

    if plan_notify_job is not None:
        scheduler.add_job(
            plan_notify_job,
            trigger=CronTrigger(hour=8, minute=0),
            id="plan_morning_push",
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=3600,
        )
        log.info("scheduler: registered plan_morning_push daily at 08:00 UTC")


def start() -> None:
    get_scheduler().start()
    log.info("scheduler: started")


def shutdown() -> None:
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        log.info("scheduler: stopped")
