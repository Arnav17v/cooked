"""`resumes` table.

`raw_text` and the R2 PDF may be deleted by the optional APScheduler retention
sweep when ``RAW_TEXT_RETENTION_ENABLED=true`` (see D-017). Otherwise text
persists until the user replaces their roast. ``raw_text_deleted_at`` is set
when a sweep scrubs a row.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    target_role: Mapped[str] = mapped_column(String(128), nullable=False)
    #: student | fresher | early | mid | senior | career_switch — calibrates LLM roast/notes
    experience_level: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    raw_text_deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    #: Mock-interview quiz final scores for this resume (append-only list in app code).
    interview_quiz_scores: Mapped[list | None] = mapped_column(JSONB, nullable=True)
