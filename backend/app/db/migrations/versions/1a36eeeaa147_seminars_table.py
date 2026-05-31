"""seminars table for event sessions."""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "1a36eeeaa147"
down_revision = "g1h2i3j4k5l6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    seminar_status = postgresql.ENUM(
        "draft", "live", "full", "completed", name="seminar_status"
    )
    seminar_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "seminars",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("host_name", sa.String(length=120), nullable=False),
        sa.Column("host_role", sa.String(length=120), nullable=False),
        sa.Column("host_company", sa.String(length=120), nullable=False),
        sa.Column("host_linkedin", sa.String(length=500), nullable=False),
        sa.Column("host_image_url", sa.String(length=1000), nullable=True),
        sa.Column("date_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("venue", sa.String(length=200), nullable=False),
        sa.Column("spots_total", sa.Integer(), nullable=False),
        sa.Column("spots_remaining", sa.Integer(), nullable=False),
        sa.Column("price_inr", sa.Integer(), nullable=False),
        sa.Column("razorpay_link", sa.String(length=1000), nullable=False),
        sa.Column("banner_image_url", sa.String(length=1000), nullable=True),
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.String(length=64)),
            nullable=False,
            server_default=sa.text("'{}'"),
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "draft",
                "live",
                "full",
                "completed",
                name="seminar_status",
                create_type=False,
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_seminars_status", "seminars", ["status"], unique=False)
    op.create_index("ix_seminars_date_time", "seminars", ["date_time"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_seminars_date_time", table_name="seminars")
    op.drop_index("ix_seminars_status", table_name="seminars")
    op.drop_table("seminars")
    seminar_status = postgresql.ENUM(
        "draft", "live", "full", "completed", name="seminar_status"
    )
    seminar_status.drop(op.get_bind(), checkfirst=True)
