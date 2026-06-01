"""Drop one-active-plan-per-user unique index — allow multiple plans."""

from __future__ import annotations

from alembic import op

revision = "k5l6m7n8o9p0"
down_revision = "j4k5l6m7n8o9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("uq_prep_plans_one_active_per_user", table_name="prep_plans")


def downgrade() -> None:
    op.create_index(
        "uq_prep_plans_one_active_per_user",
        "prep_plans",
        ["user_id"],
        unique=True,
        postgresql_where="status = 'active'",
    )
