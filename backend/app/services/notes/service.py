"""Notes CRUD, LLM generation, and post-quiz background updates."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.analysis import Analysis
from app.models.interview_session import InterviewSession
from app.models.resume import Resume
from app.models.resume_note import NotesSection, ResumeNote, SectionQuizTag
from app.services.interview import llm as interview_llm
from app.services.notes import prompts as notes_prompts
from app.services.notes.title_display import format_note_section_title_for_display
from app.services.users.access import require_resume_readable

logger = logging.getLogger(__name__)

WEAK_SCORE_THRESHOLD = 4  # 1-10 per-answer / SectionQuizTag; at or below = "couldn't answer well"


async def weak_section_ids_from_session_quiz_tags(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> set[uuid.UUID]:
    """Sections with at least one quiz tag in this session scored at/below the weak threshold."""
    tags = list(
        (await db.execute(select(SectionQuizTag).where(SectionQuizTag.session_id == session_id)))
        .scalars()
        .all()
    )
    weak: set[uuid.UUID] = set()
    for t in tags:
        if t.score <= WEAK_SCORE_THRESHOLD:
            weak.add(t.section_id)
    return weak


async def set_prep_note_weak_flags_for_resume(
    db: AsyncSession,
    *,
    resume_id: uuid.UUID,
    weak_section_ids: set[uuid.UUID],
) -> None:
    """Set ``weak_indicator`` true only for listed sections; all other prep-note sections become false."""
    stmt = (
        select(ResumeNote)
        .where(ResumeNote.resume_id == resume_id)
        .options(selectinload(ResumeNote.sections))
    )
    note = (await db.execute(stmt)).scalar_one_or_none()
    if note is None or not note.sections:
        return
    for sec in note.sections:
        sec.weak_indicator = sec.section_id in weak_section_ids
    note.updated_at = datetime.now(UTC)


_VALID_TIERS = frozenset({"project", "domain", "weak_area", "research"})


def _notes_renew_allowed() -> bool:
    s = get_settings()
    if s.dev:
        return True
    if s.allow_notes_renew:
        return True
    return (s.env or "").strip().lower() == "local"


def _kind_tag_weak_from_tier(
    tier_raw: object,
    counters: dict[str, int],
    used_tags: set[str],
) -> tuple[str, str, bool]:
    """Map LLM ``tier`` to stored ``section_kind``, ``section_tag``, and ``weak_indicator``."""
    t = str(tier_raw or "").strip().lower()
    if t not in _VALID_TIERS:
        t = "domain"
    weak = t == "weak_area"
    if t == "project":
        i = counters["project"]
        counters["project"] = i + 1
        base = f"project:{i}"
    elif t == "domain":
        i = counters["domain"]
        counters["domain"] = i + 1
        base = f"domain:{i}"
    elif t == "weak_area":
        i = counters["weak_area"]
        counters["weak_area"] = i + 1
        base = f"weak_area:{i}"
    else:
        base = "research"
    tag = base
    suffix = 2
    while tag in used_tags:
        extra = f"-{suffix}"
        max_base = max(1, 128 - len(extra))
        tag = (base[:max_base] + extra)[:128]
        suffix += 1
    used_tags.add(tag)
    kind = "project" if t == "project" else "other"
    return kind, tag, weak


async def _latest_done_analysis(db: AsyncSession, resume_id: uuid.UUID) -> Analysis | None:
    stmt = (
        select(Analysis)
        .where(Analysis.resume_id == resume_id, Analysis.status == "done")
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def renew_notes(
    db: AsyncSession,
    *,
    resume_id: uuid.UUID,
    clerk_subject: str | None,
) -> dict[str, Any]:
    """Delete existing prep notes for this resume and run generation again (dev / opt-in only)."""
    if not _notes_renew_allowed():
        raise HTTPException(
            status_code=403,
            detail="Notes renew is disabled. Set ENV=local or ALLOW_NOTES_RENEW=true on the backend.",
        )
    await require_resume_readable(db, resume_id, clerk_subject)
    await db.execute(delete(ResumeNote).where(ResumeNote.resume_id == resume_id))
    await db.flush()
    return await generate_notes(db, resume_id=resume_id, clerk_subject=clerk_subject)


async def generate_notes(
    db: AsyncSession,
    *,
    resume_id: uuid.UUID,
    clerk_subject: str | None,
) -> dict[str, Any]:
    await require_resume_readable(db, resume_id, clerk_subject)

    existing = (
        await db.execute(select(ResumeNote).where(ResumeNote.resume_id == resume_id))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail={"message": "Notes already exist for this resume", "notes_id": str(existing.notes_id)},
        )

    analysis = await _latest_done_analysis(db, resume_id)
    if analysis is None:
        raise HTTPException(status_code=400, detail="No completed roast analysis for this resume")

    stmt_resume = select(Resume).where(Resume.id == resume_id)
    resume = (await db.execute(stmt_resume)).scalar_one_or_none()
    if resume is None or not (resume.raw_text or "").strip():
        raise HTTPException(status_code=400, detail="Resume text not available")

    breakdown = analysis.score_breakdown or {}
    flags_raw = analysis.red_flags or breakdown.get("flags") or []
    flags = flags_raw if isinstance(flags_raw, list) else []
    section_verdicts = analysis.section_verdicts
    if section_verdicts is None and isinstance(breakdown.get("section_verdicts"), dict):
        section_verdicts = breakdown["section_verdicts"]

    user_prompt = notes_prompts.build_notes_generate_user_prompt(
        resume_text=resume.raw_text or "",
        role=(resume.target_role or "").strip(),
        experience_level=resume.experience_level,
        flags=flags if isinstance(flags, list) else [],
        section_verdicts=section_verdicts if isinstance(section_verdicts, dict) else None,
        one_liner=str(analysis.one_liner or breakdown.get("one_liner") or breakdown.get("headline") or "")
        .strip()
        or None,
    )

    raw, _ = await interview_llm.generate_interview_json(
        full_system_prompt=notes_prompts.NOTES_GENERATION_SYSTEM,
        user_prompt=user_prompt,
        max_output_tokens=8192,
    )

    if not isinstance(raw, dict):
        raise HTTPException(status_code=502, detail="Notes generation returned invalid JSON")

    sections_raw = raw.get("sections")
    if not isinstance(sections_raw, list) or not sections_raw:
        raise HTTPException(status_code=502, detail="Notes generation missing sections")

    note = ResumeNote(resume_id=resume_id, user_id=clerk_subject)
    db.add(note)
    await db.flush()

    used_tags: set[str] = set()
    tier_counters = {"project": 0, "domain": 0, "weak_area": 0}
    for item in sections_raw:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        content = str(item.get("content") or "").strip()
        try:
            display_order = int(item.get("display_order"))
        except (TypeError, ValueError):
            continue
        if not title or not content:
            continue
        kind, tag, weak = _kind_tag_weak_from_tier(item.get("tier"), tier_counters, used_tags)
        db.add(
            NotesSection(
                notes_id=note.notes_id,
                title=title,
                section_kind=kind,
                section_tag=tag,
                content=content,
                display_order=display_order,
                weak_indicator=weak,
            )
        )

    await db.flush()
    n_sections = (
        await db.execute(select(func.count()).select_from(NotesSection).where(NotesSection.notes_id == note.notes_id))
    ).scalar_one()
    if not n_sections:
        await db.rollback()
        raise HTTPException(status_code=502, detail="Notes generation produced no valid sections")

    await db.commit()
    await db.refresh(note, attribute_names=["sections"])

    stmt_sections = (
        select(NotesSection)
        .where(NotesSection.notes_id == note.notes_id)
        .order_by(NotesSection.display_order.asc(), NotesSection.created_at.asc())
    )
    sections = list((await db.execute(stmt_sections)).scalars().all())
    return {
        "notes_id": str(note.notes_id),
        "sections": [
            {
                "section_id": str(s.section_id),
                "section_kind": s.section_kind,
                "section_tag": s.section_tag,
                "title": format_note_section_title_for_display(s.title or ""),
                "content": s.content,
                "display_order": s.display_order,
            }
            for s in sections
        ],
    }


async def get_notes_for_resume(
    db: AsyncSession,
    *,
    resume_id: uuid.UUID,
    clerk_subject: str | None,
) -> dict[str, Any]:
    await require_resume_readable(db, resume_id, clerk_subject)

    stmt = (
        select(ResumeNote)
        .where(ResumeNote.resume_id == resume_id)
        .options(selectinload(ResumeNote.sections))
    )
    note = (await db.execute(stmt)).scalar_one_or_none()
    if note is None:
        raise HTTPException(status_code=404, detail="Notes not found")

    sections = sorted(note.sections, key=lambda s: (s.display_order, s.created_at))
    section_ids = [s.section_id for s in sections]

    avg_by_section: dict[uuid.UUID, float] = {}
    if section_ids:
        avg_stmt = (
            select(SectionQuizTag.section_id, func.avg(SectionQuizTag.score).label("avg_score"))
            .where(SectionQuizTag.section_id.in_(section_ids))
            .group_by(SectionQuizTag.section_id)
        )
        for row in (await db.execute(avg_stmt)).all():
            sid, avg_val = row[0], row[1]
            if sid is not None and avg_val is not None:
                avg_by_section[sid] = float(avg_val)

    return {
        "notes_id": str(note.notes_id),
        "resume_id": str(resume_id),
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
        "sections": [
            {
                "section_id": str(s.section_id),
                "section_kind": s.section_kind,
                "section_tag": s.section_tag,
                "title": format_note_section_title_for_display(s.title or ""),
                "content": s.content,
                "display_order": s.display_order,
                "weak_indicator": bool(s.weak_indicator),
                "avg_score": round(avg_by_section.get(s.section_id, 0.0), 2)
                if s.section_id in avg_by_section
                else None,
            }
            for s in sections
        ],
    }


async def patch_section_content(
    db: AsyncSession,
    *,
    section_id: uuid.UUID,
    content: str,
    clerk_subject: str | None,
) -> None:
    stmt = (
        select(NotesSection, ResumeNote.resume_id)
        .join(ResumeNote, NotesSection.notes_id == ResumeNote.notes_id)
        .where(NotesSection.section_id == section_id)
    )
    row = (await db.execute(stmt)).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Section not found")
    section, resume_id = row[0], row[1]
    await require_resume_readable(db, resume_id, clerk_subject)

    section.content = content
    section.updated_at = datetime.now(UTC)
    note = (
        await db.execute(select(ResumeNote).where(ResumeNote.notes_id == section.notes_id))
    ).scalar_one()
    note.updated_at = datetime.now(UTC)
    await db.commit()


async def _run_post_quiz_notes_update(resume_id: uuid.UUID, session_id: uuid.UUID) -> None:
    from app.db.session import SessionFactory

    async with SessionFactory() as db:
        try:
            session_row = (
                await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
            ).scalar_one_or_none()
            if session_row is None:
                return
            if session_row.resume_id != resume_id:
                logger.warning("notes update: session resume mismatch")
                return

            note = (
                await db.execute(
                    select(ResumeNote)
                    .where(ResumeNote.resume_id == resume_id)
                    .options(selectinload(ResumeNote.sections))
                )
            ).scalar_one_or_none()
            if note is None or not note.sections:
                return

            tags = list(
                (
                    await db.execute(
                        select(SectionQuizTag).where(SectionQuizTag.session_id == session_id)
                    )
                ).scalars().all()
            )
            if not tags:
                await set_prep_note_weak_flags_for_resume(
                    db,
                    resume_id=resume_id,
                    weak_section_ids=set(),
                )
                await db.commit()
                return

            weak_ids = await weak_section_ids_from_session_quiz_tags(db, session_id)
            await set_prep_note_weak_flags_for_resume(
                db,
                resume_id=resume_id,
                weak_section_ids=weak_ids,
            )

            resume = (
                await db.execute(select(Resume).where(Resume.id == resume_id))
            ).scalar_one_or_none()
            resume_text = (resume.raw_text or "") if resume else ""

            sections_payload = [
                {
                    "section_id": str(s.section_id),
                    "section_kind": s.section_kind,
                    "section_tag": s.section_tag,
                    "title": s.title,
                    "content": s.content,
                }
                for s in sorted(note.sections, key=lambda x: (x.display_order, x.created_at))
            ]
            quiz_results = [
                {
                    "section_id": str(t.section_id),
                    "question": t.question,
                    "score": t.score,
                    "what_they_missed": t.what_they_missed or "",
                }
                for t in tags
            ]

            user_prompt = notes_prompts.build_notes_update_user_prompt(
                resume_text=resume_text,
                sections_payload=sections_payload,
                quiz_results=quiz_results,
            )
            raw, _ = await interview_llm.generate_interview_json(
                full_system_prompt=notes_prompts.NOTES_UPDATE_SYSTEM,
                user_prompt=user_prompt,
                max_output_tokens=8192,
            )
            updated = None if not isinstance(raw, dict) else raw.get("updated_sections")
            if isinstance(updated, list):
                session_created = session_row.created_at
                now = datetime.now(UTC)

                for item in updated:
                    if not isinstance(item, dict):
                        continue
                    sid_raw = item.get("section_id")
                    try:
                        sid = uuid.UUID(str(sid_raw))
                    except (TypeError, ValueError):
                        continue
                    sec = next((s for s in note.sections if s.section_id == sid), None)
                    if sec is None:
                        continue
                    if (
                        session_created is not None
                        and sec.updated_at is not None
                        and sec.updated_at > session_created
                    ):
                        continue
                    new_content = item.get("content")
                    if not isinstance(new_content, str) or not new_content.strip():
                        continue
                    sec.content = new_content.strip()
                    sec.updated_at = now

            note.updated_at = datetime.now(UTC)
            await db.commit()
        except Exception:
            logger.exception("post-quiz notes update failed")


def schedule_post_quiz_notes_update(
    background_tasks: BackgroundTasks,
    *,
    resume_id: uuid.UUID,
    session_id: uuid.UUID,
) -> None:
    background_tasks.add_task(_run_post_quiz_notes_update, resume_id, session_id)


async def load_study_notes_for_prompt(db: AsyncSession, resume_id: uuid.UUID) -> list[dict[str, str]] | None:
    """Return notes payload for interview LLM prompts, or ``None`` if this resume has no notes."""
    stmt = (
        select(ResumeNote)
        .where(ResumeNote.resume_id == resume_id)
        .options(selectinload(ResumeNote.sections))
    )
    note = (await db.execute(stmt)).scalar_one_or_none()
    if note is None or not note.sections:
        return None
    sections = sorted(note.sections, key=lambda s: (s.display_order, s.created_at))
    return [
        {
            "section_id": str(s.section_id),
            "section_kind": s.section_kind,
            "section_tag": s.section_tag or "",
            "title": s.title,
            "content": s.content,
        }
        for s in sections
    ]


async def schedule_notes_update_if_allowed(
    db: AsyncSession,
    background_tasks: BackgroundTasks,
    *,
    resume_id: uuid.UUID,
    session_id: uuid.UUID,
    clerk_subject: str | None,
) -> dict[str, str]:
    await require_resume_readable(db, resume_id, clerk_subject)
    sess_row = await db.get(InterviewSession, session_id)
    if sess_row is None:
        raise HTTPException(status_code=404, detail="session not found")
    if sess_row.resume_id != resume_id:
        raise HTTPException(status_code=400, detail="session does not match resume")
    if sess_row.user_id and clerk_subject and sess_row.user_id != clerk_subject:
        raise HTTPException(status_code=404, detail="session not found")

    schedule_post_quiz_notes_update(background_tasks, resume_id=resume_id, session_id=session_id)
    return {"status": "updating"}
