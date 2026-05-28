"""roast bundle columns — one LLM call, section verdicts, interview_questions jsonb

Revision ID: c1a2b3c4d5e6
Revises: b2c3d4e5f6a7
Create Date: 2026-05-13

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "c1a2b3c4d5e6"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("one_liner", sa.Text(), nullable=True))
    op.add_column("analyses", sa.Column("model_used", sa.String(length=32), nullable=True))
    op.add_column(
        "analyses",
        sa.Column("section_verdicts", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "analyses",
        sa.Column("interview_questions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("analyses", sa.Column("failure_reason", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("analyses", "failure_reason")
    op.drop_column("analyses", "interview_questions")
    op.drop_column("analyses", "section_verdicts")
    op.drop_column("analyses", "model_used")
    op.drop_column("analyses", "one_liner")
