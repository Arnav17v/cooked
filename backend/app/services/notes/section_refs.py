"""Resolve prep-note section references (UUID and/or semantic tag) for a resume."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resume_note import NotesSection, ResumeNote


async def resolve_note_section_id(
    db: AsyncSession,
    *,
    resume_id: uuid.UUID,
    section_id_str: object | None,
    section_tag_str: object | None,
) -> uuid.UUID | None:
    """Return ``section_id`` when it belongs to this resume's prep notes, else try ``section_tag``."""
    stmt = (
        select(NotesSection.section_id, NotesSection.section_tag)
        .join(ResumeNote, NotesSection.notes_id == ResumeNote.notes_id)
        .where(ResumeNote.resume_id == resume_id)
    )
    rows = list((await db.execute(stmt)).all())
    if not rows:
        return None

    by_id: dict[uuid.UUID, tuple[uuid.UUID, str | None]] = {
        r[0]: (r[0], r[1]) for r in rows if r[0] is not None
    }
    by_tag: dict[str, uuid.UUID] = {}
    for sid, tag in rows:
        if sid is None:
            continue
        if tag and str(tag).strip():
            by_tag[str(tag).strip().lower()] = sid

    if section_id_str is not None:
        raw = str(section_id_str).strip()
        if raw and raw.lower() not in ("null", "none"):
            try:
                uid = uuid.UUID(raw)
            except (TypeError, ValueError):
                uid = None
            if uid is not None and uid in by_id:
                return uid

    if section_tag_str is not None:
        key = str(section_tag_str).strip().lower()
        if key and key not in ("null", "none"):
            hit = by_tag.get(key)
            if hit is not None:
                return hit

    return None


async def hydrate_question_section_refs(
    db: AsyncSession,
    *,
    resume_id: uuid.UUID,
    questions: list[dict[str, object]],
) -> None:
    """Mutate each question dict in place: set ``source_note_section_id`` to a valid UUID when possible."""
    for q in questions:
        sid = q.get("source_note_section_id")
        tag = q.get("source_note_section_tag")
        resolved = await resolve_note_section_id(
            db,
            resume_id=resume_id,
            section_id_str=sid,
            section_tag_str=tag,
        )
        if resolved is not None:
            q["source_note_section_id"] = str(resolved)
        elif sid is not None:
            raw = str(sid).strip()
            try:
                uuid.UUID(raw)
            except (TypeError, ValueError):
                q["source_note_section_id"] = None
