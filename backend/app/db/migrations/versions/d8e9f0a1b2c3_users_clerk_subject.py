"""users.clerk_subject — stable identity for signed-in roasts

Revision ID: d8e9f0a1b2c3
Revises: c1a2b3c4d5e6
Create Date: 2026-05-13

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d8e9f0a1b2c3"
down_revision: str | None = "c1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("clerk_subject", sa.String(length=191), nullable=True))
    op.create_unique_constraint(
        "uq_users_clerk_subject_nonnull",
        "users",
        ["clerk_subject"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_users_clerk_subject_nonnull", "users", type_="unique")
    op.drop_column("users", "clerk_subject")
