"""Add analyses.indepth_analysis + indepth_generated_at for on-demand in-depth tab."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "m7n8o9p0q1r2"
down_revision = "l6m7n8o9p0q1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analyses",
        sa.Column("indepth_analysis", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "analyses",
        sa.Column("indepth_generated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analyses", "indepth_generated_at")
    op.drop_column("analyses", "indepth_analysis")
