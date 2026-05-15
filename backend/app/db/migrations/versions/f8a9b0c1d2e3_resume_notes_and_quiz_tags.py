"""resume_notes, notes_sections, section_quiz_tags

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-05-13

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f8a9b0c1d2e3"
down_revision: str | None = "e7f8a9b0c1d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "resume_notes",
        sa.Column(
            "notes_id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("resume_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("notes_id"),
        sa.UniqueConstraint("resume_id", name="uq_resume_notes_resume_id"),
    )
    op.create_index("ix_resume_notes_resume_id", "resume_notes", ["resume_id"])

    op.create_table(
        "notes_sections",
        sa.Column(
            "section_id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("notes_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("weak_indicator", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["notes_id"], ["resume_notes.notes_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("section_id"),
    )
    op.create_index("ix_notes_sections_notes_id", "notes_sections", ["notes_id"])

    op.create_table(
        "section_quiz_tags",
        sa.Column(
            "tag_id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("what_they_missed", sa.Text(), nullable=True),
        sa.Column(
            "assessed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["section_id"], ["notes_sections.section_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("tag_id"),
    )
    op.create_index("ix_section_quiz_tags_session_id", "section_quiz_tags", ["session_id"])
    op.create_index("ix_section_quiz_tags_section_id", "section_quiz_tags", ["section_id"])


def downgrade() -> None:
    op.drop_index("ix_section_quiz_tags_section_id", table_name="section_quiz_tags")
    op.drop_index("ix_section_quiz_tags_session_id", table_name="section_quiz_tags")
    op.drop_table("section_quiz_tags")
    op.drop_index("ix_notes_sections_notes_id", table_name="notes_sections")
    op.drop_table("notes_sections")
    op.drop_index("ix_resume_notes_resume_id", table_name="resume_notes")
    op.drop_table("resume_notes")
