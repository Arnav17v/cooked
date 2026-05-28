"""Scheduled retention sweeps (D-015 / D-017).

- **PDF objects on R2:** optional 24h delete when ``RAW_TEXT_RETENTION_ENABLED`` (unchanged).
- **``resumes.raw_text``:** never deleted on a timer. Cleared only for orphan resumes (30+ days,
  no analyses, no interview sessions) or when the user row is removed (CASCADE).
- **Analyses:** last 10 per user on new analysis enqueue (see ``prune_analyses_for_user``).
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select

from app.core.config import get_settings
from app.core.storage import delete_object_key
from app.db.session import SessionFactory
from app.models.analysis import Analysis
from app.models.interview_session import InterviewSession
from app.models.resume import Resume

log = logging.getLogger(__name__)

MAX_ANALYSES_PER_USER = 10
ORPHAN_RESUME_DAYS = 30


async def prune_analyses_for_user(session, user_id: uuid.UUID) -> None:
    """Keep at most ``MAX_ANALYSES_PER_USER`` rows; drop oldest without ``share_slug`` first."""
    total = await session.scalar(
        select(func.count()).select_from(Analysis).join(Resume).where(Resume.user_id == user_id)
    )
    if total is None or total < MAX_ANALYSES_PER_USER:
        return

    to_delete = int(total) - MAX_ANALYSES_PER_USER + 1
    stmt = (
        select(Analysis)
        .join(Resume, Analysis.resume_id == Resume.id)
        .where(Resume.user_id == user_id)
        .order_by(Analysis.created_at.asc())
    )
    rows = list((await session.execute(stmt)).scalars().all())
    victims: list[Analysis] = []
    for row in rows:
        if len(victims) >= to_delete:
            break
        if row.share_slug:
            continue
        victims.append(row)
    if len(victims) < to_delete:
        for row in rows:
            if row in victims:
                continue
            if len(victims) >= to_delete:
                break
            victims.append(row)
    if victims:
        await session.execute(
            delete(Analysis).where(Analysis.id.in_([v.id for v in victims]))
        )
        log.info("retention: pruned %s analysis row(s) for user %s", len(victims), user_id)


async def sweep_old_resume_pdfs() -> None:
    """Delete R2 PDFs (and ``file_url``) for uploads older than the retention window."""
    settings = get_settings()
    if not settings.raw_text_retention_enabled:
        log.debug("retention: PDF sweep disabled (RAW_TEXT_RETENTION_ENABLED unset/false)")
        return
    cutoff = datetime.now(UTC) - timedelta(hours=settings.raw_text_retention_hours)
    async with SessionFactory() as session:
        stmt = select(Resume).where(
            Resume.created_at < cutoff,
            Resume.file_url.is_not(None),
        )
        rows = (await session.execute(stmt)).scalars().all()
        for row in rows:
            delete_object_key(row.file_url)
            row.file_url = None
        if rows:
            await session.commit()
            log.info("retention: removed PDF object(s) for %s resume row(s)", len(rows))
        else:
            log.debug("retention: no PDF rows to scrub")


async def sweep_orphan_resume_text() -> None:
    """Null ``raw_text`` on resumes with no analyses and no quiz sessions for 30+ days."""
    cutoff = datetime.now(UTC) - timedelta(days=ORPHAN_RESUME_DAYS)
    async with SessionFactory() as session:
        has_analysis = (
            select(Analysis.id)
            .where(Analysis.resume_id == Resume.id)
            .correlate(Resume)
            .exists()
        )
        has_session = (
            select(InterviewSession.id)
            .where(InterviewSession.resume_id == Resume.id)
            .correlate(Resume)
            .exists()
        )
        stmt = select(Resume).where(
            Resume.created_at < cutoff,
            Resume.raw_text.is_not(None),
            ~has_analysis,
            ~has_session,
        )
        rows = (await session.execute(stmt)).scalars().all()
        now = datetime.now(UTC)
        for row in rows:
            row.raw_text = None
            row.raw_text_deleted_at = now
        if rows:
            await session.commit()
            log.info("retention: cleared orphan raw_text on %s resume row(s)", len(rows))


async def sweep_old_resume_text() -> None:
    """Daily job: PDF 24h sweep (optional) + orphan raw_text cleanup. Does **not** timer-delete all raw_text."""
    await sweep_old_resume_pdfs()
    await sweep_orphan_resume_text()
