"""Daily resume-text retention sweep (D-015).

Nulls `resumes.raw_text`, deletes the corresponding R2 PDF, clears `file_url`,
and stamps `raw_text_deleted_at` for any row older than 24h.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.config import get_settings
from app.core.storage import delete_object_key
from app.db.session import SessionFactory
from app.models.resume import Resume

log = logging.getLogger(__name__)


async def sweep_old_resume_text() -> None:
    settings = get_settings()
    cutoff = datetime.now(UTC) - timedelta(hours=settings.raw_text_retention_hours)
    async with SessionFactory() as session:
        stmt = select(Resume).where(
            Resume.created_at < cutoff,
            Resume.raw_text_deleted_at.is_(None),
        )
        rows = (await session.execute(stmt)).scalars().all()
        now = datetime.now(UTC)
        for row in rows:
            delete_object_key(row.file_url)
            row.raw_text = None
            row.file_url = None
            row.raw_text_deleted_at = now
        if rows:
            await session.commit()
            log.info("retention: scrubbed %s resume row(s)", len(rows))
        else:
            log.debug("retention: no rows to scrub")
