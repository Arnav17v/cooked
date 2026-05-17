"""Add resumes.experience_level for roast calibration.

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-05-17

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c4d5e6f7a8b9"
down_revision: str | None = "b3c4d5e6f7a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "resumes",
        sa.Column(
            "experience_level",
            sa.String(length=32),
            nullable=False,
            server_default="fresher",
        ),
    )
    op.alter_column("resumes", "experience_level", server_default=None)


def downgrade() -> None:
    op.drop_column("resumes", "experience_level")
