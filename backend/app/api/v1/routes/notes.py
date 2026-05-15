"""Interview prep notes — generate, read, patch, post-quiz refresh."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import optional_clerk_subject
from app.db.session import get_session
from app.services.llm.errors import RecoverableLLMError
from app.services.notes import service as notes_service

router = APIRouter(prefix="/notes", tags=["notes"])


class NotesGenerateBody(BaseModel):
    resume_id: uuid.UUID


class NotesSectionPatchBody(BaseModel):
    content: str = Field(min_length=1, max_length=100_000)


class NotesUpdateBody(BaseModel):
    resume_id: uuid.UUID
    session_id: uuid.UUID


@router.post("/renew")
async def notes_renew(
    body: NotesGenerateBody,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    try:
        out = await notes_service.renew_notes(
            session,
            resume_id=body.resume_id,
            clerk_subject=clerk_subject,
        )
        await session.commit()
        return out
    except HTTPException:
        await session.rollback()
        raise
    except RecoverableLLMError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                str(e)
                if len(str(e)) < 500
                else "Notes AI is temporarily unavailable. Try again in a minute."
            ),
        ) from e


@router.post("/generate")
async def notes_generate(
    body: NotesGenerateBody,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    try:
        out = await notes_service.generate_notes(
            session,
            resume_id=body.resume_id,
            clerk_subject=clerk_subject,
        )
        await session.commit()
        return out
    except HTTPException:
        await session.rollback()
        raise
    except RecoverableLLMError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                str(e)
                if len(str(e)) < 500
                else "Notes AI is temporarily unavailable. Try again in a minute."
            ),
        ) from e


@router.get("/{resume_id}")
async def notes_get(
    resume_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    out = await notes_service.get_notes_for_resume(
        session,
        resume_id=resume_id,
        clerk_subject=clerk_subject,
    )
    return out


@router.patch("/section/{section_id}")
async def notes_patch_section(
    section_id: uuid.UUID,
    body: NotesSectionPatchBody,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, bool]:
    await notes_service.patch_section_content(
        session,
        section_id=section_id,
        content=body.content,
        clerk_subject=clerk_subject,
    )
    await session.commit()
    return {"ok": True}


@router.post("/update")
async def notes_post_quiz_update(
    body: NotesUpdateBody,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, str]:
    try:
        out = await notes_service.schedule_notes_update_if_allowed(
            session,
            background_tasks,
            resume_id=body.resume_id,
            session_id=body.session_id,
            clerk_subject=clerk_subject,
        )
        await session.commit()
        return out
    except HTTPException:
        await session.rollback()
        raise
