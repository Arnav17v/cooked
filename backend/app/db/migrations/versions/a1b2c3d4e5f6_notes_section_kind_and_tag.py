"""notes_sections: section_kind + section_tag for resume-aligned prep notes.

Revision ID: a1b2c3d4e5f6
Revises: f8a9b0c1d2e3
Create Date: 2026-05-14

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "f8a9b0c1d2e3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "notes_sections",
        sa.Column("section_kind", sa.String(length=32), server_default="other", nullable=False),
    )
    op.add_column("notes_sections", sa.Column("section_tag", sa.String(length=128), nullable=True))
    op.execute(
        sa.text("""
        UPDATE notes_sections
        SET section_kind = 'other',
            section_tag = 'legacy-' || display_order::text
        """)
    )


def downgrade() -> None:
    op.drop_column("notes_sections", "section_tag")
    op.drop_column("notes_sections", "section_kind")
