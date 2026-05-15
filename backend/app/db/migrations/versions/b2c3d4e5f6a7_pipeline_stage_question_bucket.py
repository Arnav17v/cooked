"""pipeline_stage on analyses, question_bucket on questions

Revision ID: b2c3d4e5f6a7
Revises: 34a0d0f474e8
Create Date: 2026-05-12

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "34a0d0f474e8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("pipeline_stage", sa.String(length=64), nullable=True))
    op.add_column(
        "questions",
        sa.Column(
            "question_bucket",
            sa.String(length=16),
            server_default="bullet",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("questions", "question_bucket")
    op.drop_column("analyses", "pipeline_stage")
