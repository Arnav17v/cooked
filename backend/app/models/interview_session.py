"""`interview_sessions` — resume-based adaptive interview quiz."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False
    )
    #: Clerk `sub` when the client authenticated at session start; anonymous ok.
    user_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    #: Optional JD for this quiz only — not stored on the resume.
    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    history_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    results_viewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    questions_asked: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_difficulty: Mapped[str] = mapped_column(Text, default="medium", nullable=False)
    running_score_sum: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    hard_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pending_question: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    turns: Mapped[list[object]] = mapped_column(JSONB, default=list, nullable=False)
    final_summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
