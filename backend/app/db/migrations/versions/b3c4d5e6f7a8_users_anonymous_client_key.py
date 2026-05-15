"""users.anonymous_client_key — stable anonymous browser identity for uploads.

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-05-14

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3c4d5e6f7a8"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("anonymous_client_key", sa.String(length=36), nullable=True),
    )
    op.create_index(
        "ix_users_anonymous_client_key",
        "users",
        ["anonymous_client_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_users_anonymous_client_key", table_name="users")
    op.drop_column("users", "anonymous_client_key")
