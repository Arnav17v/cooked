"""`users` table.

Daily rate-limit state (`analyses_today`, `last_analysis_date`) lives directly
on the row. Enforced before any LLM call per D-011.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str | None] = mapped_column(String(320), unique=True, nullable=True)
    clerk_subject: Mapped[str | None] = mapped_column(
        String(191), unique=True, nullable=True
    )
    #: Browser UUID from `X-Cooked-Anonymous-Id` — reuses one `users` row per device for anon uploads.
    anonymous_client_key: Mapped[str | None] = mapped_column(
        String(36), unique=True, nullable=True
    )
    plan: Mapped[str] = mapped_column(String(32), default="free", nullable=False)
    analyses_today: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_analysis_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
