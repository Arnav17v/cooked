"""`seminars` table for live seminar sessions."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SeminarStatus(enum.StrEnum):
    draft = "draft"
    live = "live"
    full = "full"
    completed = "completed"


class Seminar(Base):
    __tablename__ = "seminars"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    host_name: Mapped[str] = mapped_column(String(120), nullable=False)
    host_role: Mapped[str] = mapped_column(String(120), nullable=False)
    host_company: Mapped[str] = mapped_column(String(120), nullable=False)
    host_linkedin: Mapped[str] = mapped_column(String(500), nullable=False)
    host_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    date_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    venue: Mapped[str] = mapped_column(String(200), nullable=False)
    spots_total: Mapped[int] = mapped_column(Integer, nullable=False)
    spots_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    price_inr: Mapped[int] = mapped_column(Integer, nullable=False)
    razorpay_link: Mapped[str] = mapped_column(String(1000), nullable=False)
    banner_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, default=list
    )
    status: Mapped[SeminarStatus] = mapped_column(
        Enum(SeminarStatus, name="seminar_status"),
        nullable=False,
        default=SeminarStatus.draft,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
