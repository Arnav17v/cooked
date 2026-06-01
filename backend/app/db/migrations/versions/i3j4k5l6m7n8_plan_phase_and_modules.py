"""prep_plans.phase + plan_day_modules table."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "i3j4k5l6m7n8"
down_revision = "h2i3j4k5l6m7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "prep_plans",
        sa.Column("phase", sa.String(length=16), nullable=False, server_default="overview"),
    )
    op.alter_column("prep_plans", "phase", server_default=None)

    op.create_table(
        "plan_day_modules",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("plan_day_id", sa.UUID(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("link_url", sa.String(length=2048), nullable=True),
        sa.Column("quiz_topics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("quiz_session_id", sa.UUID(), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["plan_day_id"], ["plan_days.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["quiz_session_id"], ["interview_sessions.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_plan_day_modules_plan_day_id",
        "plan_day_modules",
        ["plan_day_id"],
        unique=False,
    )
    op.create_index(
        "ix_plan_day_modules_plan_day_order",
        "plan_day_modules",
        ["plan_day_id", "display_order"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_plan_day_modules_plan_day_order", table_name="plan_day_modules")
    op.drop_index("ix_plan_day_modules_plan_day_id", table_name="plan_day_modules")
    op.drop_table("plan_day_modules")
    op.drop_column("prep_plans", "phase")
