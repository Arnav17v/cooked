"""`plan_days` — one calendar day in a prep plan."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class PlanDayModulesStatus(str, enum.Enum):
    pending = "pending"
    generating = "generating"
    ready = "ready"
    failed = "failed"


class PlanDay(Base):
    __tablename__ = "plan_days"
    __table_args__ = (UniqueConstraint("plan_id", "day_number", name="uq_plan_days_plan_day_number"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("prep_plans.id", ondelete="CASCADE"), nullable=False
    )
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    focus_area: Mapped[str] = mapped_column(Text, nullable=False)
    morning_task: Mapped[str] = mapped_column(Text, nullable=False)
    evening_task: Mapped[str] = mapped_column(Text, nullable=False)
    quiz_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interview_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    modules_status: Mapped[str] = mapped_column(
        String(16), default=PlanDayModulesStatus.pending.value, nullable=False
    )
    modules_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    modules_generated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    plan: Mapped["PrepPlan"] = relationship("PrepPlan", back_populates="days")
    modules: Mapped[list["PlanDayModule"]] = relationship(
        "PlanDayModule",
        back_populates="plan_day",
        cascade="all, delete-orphan",
        order_by="PlanDayModule.display_order",
    )
