"""`analyses` table.

`share_slug` is the public URL token — never expose `id`. `prompt_version` is
recorded on every row so we can A/B prompts safely (D-009 + D-012). The jsonb
columns are intentionally schemaless to absorb LLM-output evolution.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
    )
    share_slug: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)

    cooked_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    red_flags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    rewritten_bullets: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    pipeline_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)

    one_liner: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(32), nullable=True)
    section_verdicts: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    interview_questions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)

    indepth_analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    indepth_generated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
