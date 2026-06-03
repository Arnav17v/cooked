"""`prep_plans` — interview prep planner for a user + resume."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class PrepPlanStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"


class PrepPlanPhase(str, enum.Enum):
    overview = "overview"
    execution = "execution"


class PrepPlanInitiationStatus(str, enum.Enum):
    idle = "idle"
    running = "running"
    failed = "failed"


class PrepPlan(Base):
    __tablename__ = "prep_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False
    )
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(128), nullable=False)
    interview_date: Mapped[date] = mapped_column(Date, nullable=False)
    jd_text: Mapped[str] = mapped_column(Text, nullable=False)
    plan_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default=PrepPlanStatus.active.value, nullable=False)
    phase: Mapped[str] = mapped_column(
        String(16), default=PrepPlanPhase.overview.value, nullable=False
    )
    initiation_status: Mapped[str] = mapped_column(
        String(16),
        default=PrepPlanInitiationStatus.idle.value,
        nullable=False,
    )
    initiation_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    days: Mapped[list["PlanDay"]] = relationship(
        "PlanDay",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlanDay.day_number",
    )
