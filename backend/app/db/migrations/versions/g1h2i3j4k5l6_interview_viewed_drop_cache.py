"""interview_sessions: results_viewed_at; drop unused cache_handle."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "g1h2i3j4k5l6"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "interview_sessions",
        sa.Column("results_viewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.drop_column("interview_sessions", "cache_handle")


def downgrade() -> None:
    op.add_column(
        "interview_sessions",
        sa.Column("cache_handle", sa.Text(), nullable=True),
    )
    op.drop_column("interview_sessions", "results_viewed_at")
