"""prep_plans, plan_days, push_subscriptions tables."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "h2i3j4k5l6m7"
down_revision = "1a36eeeaa147"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "prep_plans",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("resume_id", sa.UUID(), nullable=False),
        sa.Column("company_name", sa.String(length=200), nullable=False),
        sa.Column("role", sa.String(length=128), nullable=False),
        sa.Column("interview_date", sa.Date(), nullable=False),
        sa.Column("jd_text", sa.Text(), nullable=False),
        sa.Column("plan_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("prompt_version", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_prep_plans_user_id", "prep_plans", ["user_id"], unique=False)
    op.create_index("ix_prep_plans_resume_id", "prep_plans", ["resume_id"], unique=False)
    op.create_index("ix_prep_plans_user_status", "prep_plans", ["user_id", "status"], unique=False)
    op.create_index(
        "uq_prep_plans_one_active_per_user",
        "prep_plans",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "plan_days",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("plan_id", sa.UUID(), nullable=False),
        sa.Column("day_number", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("focus_area", sa.Text(), nullable=False),
        sa.Column("morning_task", sa.Text(), nullable=False),
        sa.Column("evening_task", sa.Text(), nullable=False),
        sa.Column("quiz_session_id", sa.UUID(), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["plan_id"], ["prep_plans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["quiz_session_id"], ["interview_sessions.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plan_id", "day_number", name="uq_plan_days_plan_day_number"),
    )
    op.create_index("ix_plan_days_plan_id", "plan_days", ["plan_id"], unique=False)
    op.create_index("ix_plan_days_date", "plan_days", ["date"], unique=False)

    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("endpoint", sa.String(length=2048), nullable=False),
        sa.Column(
            "subscription_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "endpoint", name="uq_push_subscriptions_user_endpoint"),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_user_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
    op.drop_index("ix_plan_days_date", table_name="plan_days")
    op.drop_index("ix_plan_days_plan_id", table_name="plan_days")
    op.drop_table("plan_days")
    op.drop_index("uq_prep_plans_one_active_per_user", table_name="prep_plans")
    op.drop_index("ix_prep_plans_user_status", table_name="prep_plans")
    op.drop_index("ix_prep_plans_resume_id", table_name="prep_plans")
    op.drop_index("ix_prep_plans_user_id", table_name="prep_plans")
    op.drop_table("prep_plans")
