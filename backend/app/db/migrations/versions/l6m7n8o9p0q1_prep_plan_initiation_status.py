"""Add prep_plans initiation_status + initiation_error for async initiate."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "l6m7n8o9p0q1"
down_revision = "k5l6m7n8o9p0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "prep_plans",
        sa.Column(
            "initiation_status",
            sa.String(length=16),
            nullable=False,
            server_default="idle",
        ),
    )
    op.add_column(
        "prep_plans",
        sa.Column("initiation_error", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("prep_plans", "initiation_error")
    op.drop_column("prep_plans", "initiation_status")
