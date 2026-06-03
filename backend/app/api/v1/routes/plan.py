"""Interview prep planner routes."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps_auth import require_clerk_subject
from app.core.config import get_settings
from app.db.session import get_session
from app.services.plan import service as plan_service

router = APIRouter(prefix="/plan", tags=["plan"])


class PlanGenerateBody(BaseModel):
    resume_id: uuid.UUID
    company_name: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=128)
    days_count: int = Field(ge=1, le=8)
    jd_text: str = Field(min_length=1)
    experience_level: str | None = None


class PlanModifyBody(BaseModel):
    natural_language_instruction: str = Field(min_length=1, max_length=500)


class PushSubscribeBody(BaseModel):
    subscription: dict[str, Any]


class LinkQuizBody(BaseModel):
    session_id: uuid.UUID


@router.post("/generate")
async def plan_generate(
    body: PlanGenerateBody,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.generate_plan(
        session,
        clerk_subject=clerk_subject,
        resume_id=body.resume_id,
        company_name=body.company_name,
        role=body.role,
        days_count=body.days_count,
        jd_text=body.jd_text,
        experience_level=body.experience_level,
    )


@router.get("/list")
async def plan_list(
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.list_plans(session, clerk_subject=clerk_subject)


@router.get("/active")
async def plan_active(
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.get_active_plan(session, clerk_subject=clerk_subject)


@router.get("/vapid-public-key")
async def plan_vapid_public_key(
    clerk_subject: str = Depends(require_clerk_subject),  # noqa: ARG001
) -> dict[str, str | None]:
    settings = get_settings()
    key = (settings.vapid_public_key or "").strip() or None
    return {"public_key": key, "enabled": bool(key and settings.plan_push_enabled)}


@router.get("/{plan_id}")
async def plan_get(
    plan_id: uuid.UUID,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.get_plan(
        session,
        clerk_subject=clerk_subject,
        plan_id=plan_id,
    )


@router.post("/notifications/subscribe")
async def plan_push_subscribe(
    body: PushSubscribeBody,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, str]:
    return await plan_service.subscribe_push(
        session,
        clerk_subject=clerk_subject,
        subscription=body.subscription,
    )


@router.post("/{plan_id}/initiate", status_code=status.HTTP_202_ACCEPTED)
async def plan_initiate(
    plan_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> JSONResponse:
    out = await plan_service.enqueue_initiate_plan(
        session,
        clerk_subject=clerk_subject,
        plan_id=plan_id,
    )
    background_tasks.add_task(
        plan_service.run_initiate_plan_pipeline,
        plan_id,
        clerk_subject,
    )
    return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=out)


@router.post("/day/{day_id}/generate-modules")
async def plan_day_generate_modules(
    day_id: uuid.UUID,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.generate_plan_day_modules(
        session,
        clerk_subject=clerk_subject,
        day_id=day_id,
    )


@router.patch("/module/{module_id}/complete")
async def plan_module_complete(
    module_id: uuid.UUID,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.complete_plan_module(
        session,
        clerk_subject=clerk_subject,
        module_id=module_id,
    )


@router.post("/module/{module_id}/link-quiz")
async def plan_module_link_quiz(
    module_id: uuid.UUID,
    body: LinkQuizBody,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.link_plan_module_quiz(
        session,
        clerk_subject=clerk_subject,
        module_id=module_id,
        session_id=body.session_id,
    )


@router.patch("/{plan_id}/modify")
async def plan_modify(
    plan_id: uuid.UUID,
    body: PlanModifyBody,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.modify_plan(
        session,
        clerk_subject=clerk_subject,
        plan_id=plan_id,
        natural_language_instruction=body.natural_language_instruction,
    )


@router.patch("/day/{day_id}/complete")
async def plan_day_complete(
    day_id: uuid.UUID,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.complete_plan_day(
        session,
        clerk_subject=clerk_subject,
        day_id=day_id,
    )


@router.post("/day/{day_id}/link-quiz")
async def plan_day_link_quiz(
    day_id: uuid.UUID,
    body: LinkQuizBody,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, object]:
    return await plan_service.link_plan_day_quiz(
        session,
        clerk_subject=clerk_subject,
        day_id=day_id,
        session_id=body.session_id,
    )


@router.delete("/{plan_id}")
async def plan_abandon(
    plan_id: uuid.UUID,
    clerk_subject: str = Depends(require_clerk_subject),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, str]:
    return await plan_service.abandon_plan(
        session,
        clerk_subject=clerk_subject,
        plan_id=plan_id,
    )
