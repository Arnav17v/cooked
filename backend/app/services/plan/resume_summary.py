"""Build a compact resume summary for plan LLM prompts."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.analysis import Analysis
from app.models.resume import Resume
from app.models.resume_note import NotesSection, ResumeNote


async def build_resume_summary(
    db: AsyncSession,
    *,
    resume: Resume,
    resume_id: uuid.UUID,
) -> str:
    parts: list[str] = []
    settings = get_settings()
    char_cap = settings.llm_resume_text_token_soft_limit * 4

    analysis = await db.scalar(
        select(Analysis)
        .where(Analysis.resume_id == resume_id, Analysis.status == "done")
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    if analysis is not None:
        if analysis.one_liner:
            parts.append(f"Roast one-liner: {analysis.one_liner.strip()}")
        verdicts = analysis.section_verdicts or {}
        if isinstance(verdicts, dict) and verdicts:
            vlines = [
                f"  {k}: {str(v)[:200]}"
                for k, v in verdicts.items()
                if v
            ]
            if vlines:
                parts.append("Section verdicts:\n" + "\n".join(vlines[:4]))
        flags = analysis.red_flags or []
        if isinstance(flags, list) and flags:
            for i, flag in enumerate(flags[:3]):
                if isinstance(flag, dict):
                    issue = flag.get("issue") or flag.get("title") or ""
                    if issue:
                        parts.append(f"Red flag {i + 1}: {str(issue)[:180]}")

    note = await db.scalar(select(ResumeNote).where(ResumeNote.resume_id == resume_id))
    if note is not None:
        weak_sections = (
            await db.scalars(
                select(NotesSection)
                .where(
                    NotesSection.notes_id == note.notes_id,
                    NotesSection.weak_indicator.is_(True),
                )
                .order_by(NotesSection.display_order.asc())
                .limit(8)
            )
        ).all()
        if weak_sections:
            titles = ", ".join(s.title for s in weak_sections)
            parts.append(f"Weak prep note sections: {titles}")

    if not parts and resume.raw_text:
        snippet = resume.raw_text.strip()[:char_cap]
        parts.append(f"Resume excerpt:\n{snippet}")

    if not parts:
        return "No roast or resume text available — plan from JD and role only."

    out = "\n\n".join(parts)
    if len(out) > char_cap:
        return out[: char_cap - 3] + "..."
    return out
