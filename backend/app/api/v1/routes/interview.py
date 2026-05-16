"""Adaptive interview quiz — start, answer, summary."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import optional_clerk_subject
from app.core.config import get_settings
from app.db.session import get_session
from app.services.interview import service as interview_service
from app.services.llm.errors import RecoverableLLMError

router = APIRouter(prefix="/interview", tags=["interview"])


class InterviewStartBody(BaseModel):
    resume_id: uuid.UUID
    role: str = Field(min_length=1, max_length=512)
    hard_mode: bool = False
    #: 3 = short, 10 = medium, 20 = long. Omit to use server default.
    question_count: int | None = Field(default=None, ge=1, le=20)


class InterviewAnswerBody(BaseModel):
    session_id: uuid.UUID
    answer: str = Field(min_length=1, max_length=50_000)


class InterviewScoreBody(BaseModel):
    session_id: uuid.UUID
    answers: list[str] = Field(
        ...,
        description="One trimmed non-empty answer per question, same order as POST /interview/start",
    )


@router.post("/start")
async def interview_start(
    body: InterviewStartBody,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    try:
        out = await interview_service.start_session(
            session,
            resume_id=body.resume_id,
            role=body.role,
            clerk_subject=clerk_subject,
            hard_mode=body.hard_mode,
            question_count=body.question_count,
        )
        await session.commit()
        return out
    except RecoverableLLMError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                str(e)
                if len(str(e)) < 500
                else "Interview AI is temporarily unavailable. Try again in a minute."
            ),
        ) from e


@router.post("/answer")
async def interview_answer(
    body: InterviewAnswerBody,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    try:
        out = await interview_service.submit_answer(
            session,
            session_id=body.session_id,
            answer=body.answer,
            clerk_subject=clerk_subject,
        )
        await session.commit()
        return out
    except RecoverableLLMError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                str(e)
                if len(str(e)) < 500
                else "Interview AI is temporarily unavailable. Try again in a minute."
            ),
        ) from e


@router.post("/score")
async def interview_score(
    body: InterviewScoreBody,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    try:
        out = await interview_service.score_quiz(
            session,
            session_id=body.session_id,
            answers=body.answers,
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
                else "Interview AI is temporarily unavailable. Try again in a minute."
            ),
        ) from e


@router.get("/summary/{session_id}")
async def interview_summary(
    session_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, object]:
    try:
        sid = uuid.UUID(session_id.strip())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid session_id",
        ) from e

    return await interview_service.get_summary(
        session,
        session_id=sid,
        clerk_subject=clerk_subject,
    )
