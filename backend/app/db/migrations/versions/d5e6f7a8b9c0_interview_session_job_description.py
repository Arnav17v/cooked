"""Add interview_sessions.job_description (per-quiz, not persisted on resume).

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-05-19

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d5e6f7a8b9c0"
down_revision: str | None = "c4d5e6f7a8b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "interview_sessions",
        sa.Column("job_description", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("interview_sessions", "job_description")
