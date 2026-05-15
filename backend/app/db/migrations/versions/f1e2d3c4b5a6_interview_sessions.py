"""interview_sessions — adaptive resume interview quiz

Revision ID: f1e2d3c4b5a6
Revises: d8e9f0a1b2c3
Create Date: 2026-05-13

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f1e2d3c4b5a6"
down_revision: str | None = "d8e9f0a1b2c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "interview_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("resume_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=True),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("cache_handle", sa.Text(), nullable=True),
        sa.Column("history_summary", sa.Text(), nullable=True),
        sa.Column("questions_asked", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("current_difficulty", sa.Text(), server_default=sa.text("'medium'"), nullable=False),
        sa.Column("running_score_sum", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("hard_mode", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("pending_question", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "turns",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("final_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_interview_sessions_resume_id",
        "interview_sessions",
        ["resume_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_interview_sessions_resume_id", table_name="interview_sessions")
    op.drop_table("interview_sessions")
