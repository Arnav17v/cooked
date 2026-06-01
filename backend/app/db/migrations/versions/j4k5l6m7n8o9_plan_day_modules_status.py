"""plan_days modules_status + generation audit columns."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "j4k5l6m7n8o9"
down_revision = "i3j4k5l6m7n8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "plan_days",
        sa.Column("modules_status", sa.String(length=16), nullable=False, server_default="pending"),
    )
    op.add_column("plan_days", sa.Column("modules_error", sa.Text(), nullable=True))
    op.add_column(
        "plan_days",
        sa.Column("modules_generated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("plan_days", "modules_status", server_default=None)

    # Days that already have modules (execution plans) → ready
    op.execute(
        sa.text(
            """
            UPDATE plan_days d
            SET modules_status = 'ready',
                modules_generated_at = NOW()
            WHERE EXISTS (
                SELECT 1 FROM plan_day_modules m WHERE m.plan_day_id = d.id
            )
            """
        )
    )


def downgrade() -> None:
    op.drop_column("plan_days", "modules_generated_at")
    op.drop_column("plan_days", "modules_error")
    op.drop_column("plan_days", "modules_status")
