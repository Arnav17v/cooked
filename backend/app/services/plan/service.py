"""Prep plan CRUD and LLM generation."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, date, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.interview_session import InterviewSession
from app.models.plan_day import PlanDay, PlanDayModulesStatus
from app.models.plan_day_module import PlanDayModule, PlanModuleKind
from app.models.prep_plan import PrepPlan, PrepPlanPhase, PrepPlanStatus
from app.models.push_subscription import PushSubscription
from app.models.resume import Resume
from app.schemas.llm_outputs import (
    PrepPlanDayLLMItem,
    PrepPlanDayModulesLLMItem,
    PrepPlanLLMOutput,
    PrepPlanModuleLLMItem,
)
from app.services.interview import llm as interview_llm
from app.services.plan import plan_input, prompts
from app.services.plan.limits import (
    assert_can_generate_day_modules,
    assert_can_generate_plan,
    assert_can_modify_plan,
)
from app.services.plan.resume_summary import build_resume_summary
from app.services.resume.experience_level import normalize_experience_level
from app.services.users.access import require_resume_readable
from app.services.users.clerk_user import require_user_for_clerk

log = logging.getLogger(__name__)


def _utc_today() -> date:
    return datetime.now(UTC).date()


def _day_progress(modules: list[PlanDayModule]) -> int:
    if not modules:
        return 0
    done = sum(1 for m in modules if m.completed)
    return int(round(100 * done / len(modules)))


def _heat_label_from_final(score: int) -> str:
    s = max(0, min(100, score))
    if s >= 75:
        return "Raw"
    if s >= 55:
        return "Medium"
    if s >= 35:
        return "Hard"
    return "Cooked"


async def _quiz_summaries_for_session_ids(
    db: AsyncSession, session_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, Any]]:
    if not session_ids:
        return {}
    rows = (
        await db.scalars(
            select(InterviewSession).where(
                InterviewSession.id.in_(session_ids),
                InterviewSession.completed_at.is_not(None),
            )
        )
    ).all()
    out: dict[uuid.UUID, dict[str, Any]] = {}
    for row in rows:
        fs = row.final_summary if isinstance(row.final_summary, dict) else {}
        try:
            score = int(fs.get("final_score"))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            continue
        score = max(0, min(100, score))
        heat = str(fs.get("heat_label") or _heat_label_from_final(score))
        one_liner = str(fs.get("one_liner") or "").strip() or None
        out[row.id] = {
            "final_score": score,
            "heat_label": heat,
            "one_liner": one_liner,
        }
    return out


def _module_to_dict(
    m: PlanDayModule,
    *,
    day_date: date,
    today: date,
    quiz_summaries: dict[uuid.UUID, dict[str, Any]],
) -> dict[str, Any]:
    is_backlog = day_date < today and not m.completed
    topics = m.quiz_topics if isinstance(m.quiz_topics, list) else []
    quiz_score: int | None = None
    quiz_heat_label: str | None = None
    quiz_one_liner: str | None = None
    if m.quiz_session_id:
        summary = quiz_summaries.get(m.quiz_session_id)
        if summary:
            quiz_score = int(summary["final_score"])
            quiz_heat_label = str(summary["heat_label"])
            quiz_one_liner = summary.get("one_liner")
    return {
        "id": str(m.id),
        "display_order": m.display_order,
        "kind": m.kind,
        "title": m.title,
        "content": m.content,
        "link_url": m.link_url,
        "quiz_topics": topics,
        "quiz_session_id": str(m.quiz_session_id) if m.quiz_session_id else None,
        "quiz_score": quiz_score,
        "quiz_heat_label": quiz_heat_label,
        "quiz_one_liner": quiz_one_liner,
        "completed": m.completed,
        "completed_at": m.completed_at.isoformat() if m.completed_at else None,
        "is_backlog": is_backlog,
    }


def _plan_to_dict(
    plan: PrepPlan,
    days: list[PlanDay],
    modules_by_day: dict[uuid.UUID, list[PlanDayModule]],
    quiz_summaries: dict[uuid.UUID, dict[str, Any]],
) -> dict[str, Any]:
    plan_json = plan.plan_json or {}
    day_json_by_num = {
        int(d.get("day_number", 0)): d
        for d in (plan_json.get("days") or [])
        if isinstance(d, dict)
    }
    today = _utc_today()
    backlog_count = 0
    day_payloads: list[dict[str, Any]] = []

    for d in sorted(days, key=lambda x: x.day_number):
        mods = sorted(modules_by_day.get(d.id, []), key=lambda m: m.display_order)
        day_is_backlog = d.date < today and any(not m.completed for m in mods)
        for m in mods:
            if d.date < today and not m.completed:
                backlog_count += 1
        day_payloads.append(
            {
                "id": str(d.id),
                "day_number": d.day_number,
                "date": d.date.isoformat(),
                "focus_area": d.focus_area,
                "morning_task": d.morning_task,
                "evening_task": d.evening_task,
                "completed": d.completed,
                "quiz_session_id": str(d.quiz_session_id) if d.quiz_session_id else None,
                "quiz_topics": (day_json_by_num.get(d.day_number) or {}).get("quiz_topics") or [],
                "intensity": (day_json_by_num.get(d.day_number) or {}).get("intensity") or "medium",
                "is_today": d.date == today,
                "is_backlog": day_is_backlog,
                "progress_pct": _day_progress(mods),
                "modules_status": d.modules_status,
                "modules_error": d.modules_error,
                "modules": [
                    _module_to_dict(m, day_date=d.date, today=today, quiz_summaries=quiz_summaries)
                    for m in mods
                ],
            }
        )

    return {
        "plan": {
            "id": str(plan.id),
            "resume_id": str(plan.resume_id),
            "company_name": plan.company_name,
            "role": plan.role,
            "interview_date": plan.interview_date.isoformat(),
            "status": plan.status,
            "phase": plan.phase,
            "plan_title": plan_json.get("plan_title"),
            "summary": plan_json.get("summary"),
            "prompt_version": plan.prompt_version,
            "created_at": plan.created_at.isoformat(),
            "updated_at": plan.updated_at.isoformat(),
            "degraded_summary": plan_json.get("_degraded"),
            "backlog_count": backlog_count,
        },
        "days": day_payloads,
    }


async def _modules_for_days(
    db: AsyncSession, day_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[PlanDayModule]]:
    if not day_ids:
        return {}
    rows = (
        await db.scalars(
            select(PlanDayModule)
            .where(PlanDayModule.plan_day_id.in_(day_ids))
            .order_by(PlanDayModule.display_order.asc())
        )
    ).all()
    out: dict[uuid.UUID, list[PlanDayModule]] = {did: [] for did in day_ids}
    for m in rows:
        out.setdefault(m.plan_day_id, []).append(m)
    return out


async def _build_plan_response(db: AsyncSession, plan_id: uuid.UUID) -> dict[str, Any]:
    """Load plan + days + modules with explicit queries (safe after ``commit``)."""
    plan_row = await db.get(PrepPlan, plan_id)
    if plan_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    day_rows = await _plan_days_for_plan(db, plan_id)
    modules_by_day = await _modules_for_days(db, [d.id for d in day_rows])
    session_ids: list[uuid.UUID] = []
    for mods in modules_by_day.values():
        for mod in mods:
            if mod.quiz_session_id:
                session_ids.append(mod.quiz_session_id)
    quiz_summaries = await _quiz_summaries_for_session_ids(db, session_ids)
    return _plan_to_dict(plan_row, day_rows, modules_by_day, quiz_summaries)


async def _load_plan_owned(
    db: AsyncSession,
    plan_id: uuid.UUID,
    user_id: uuid.UUID,
) -> PrepPlan:
    plan = await db.scalar(
        select(PrepPlan).where(PrepPlan.id == plan_id, PrepPlan.user_id == user_id)
    )
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


async def _active_plan_for_user(db: AsyncSession, user_id: uuid.UUID) -> PrepPlan | None:
    return await db.scalar(
        select(PrepPlan)
        .where(PrepPlan.user_id == user_id, PrepPlan.status == PrepPlanStatus.active.value)
        .order_by(PrepPlan.updated_at.desc())
        .limit(1)
    )


async def _progress_for_plans(
    db: AsyncSession, plan_ids: list[uuid.UUID]
) -> dict[uuid.UUID, tuple[int, int]]:
    """Return plan_id -> (progress_pct, days_count)."""
    if not plan_ids:
        return {}
    day_rows = list(
        (
            await db.scalars(
                select(PlanDay)
                .where(PlanDay.plan_id.in_(plan_ids))
                .order_by(PlanDay.day_number.asc())
            )
        ).all()
    )
    day_ids = [d.id for d in day_rows]
    modules_by_day = await _modules_for_days(db, day_ids)
    days_by_plan: dict[uuid.UUID, list[PlanDay]] = {pid: [] for pid in plan_ids}
    for d in day_rows:
        days_by_plan.setdefault(d.plan_id, []).append(d)

    out: dict[uuid.UUID, tuple[int, int]] = {}
    for pid in plan_ids:
        days = days_by_plan.get(pid, [])
        all_mods: list[PlanDayModule] = []
        for d in days:
            all_mods.extend(modules_by_day.get(d.id, []))
        days_count = len(days)
        if not all_mods:
            out[pid] = (0, days_count)
        else:
            done = sum(1 for m in all_mods if m.completed)
            out[pid] = (int(round(100 * done / len(all_mods))), days_count)
    return out


def _plan_summary_dict(plan: PrepPlan, *, progress_pct: int, days_count: int) -> dict[str, Any]:
    plan_json = plan.plan_json or {}
    return {
        "id": str(plan.id),
        "resume_id": str(plan.resume_id),
        "company_name": plan.company_name,
        "role": plan.role,
        "interview_date": plan.interview_date.isoformat(),
        "status": plan.status,
        "phase": plan.phase,
        "plan_title": plan_json.get("plan_title"),
        "summary": plan_json.get("summary"),
        "created_at": plan.created_at.isoformat(),
        "updated_at": plan.updated_at.isoformat(),
        "days_count": days_count,
        "progress_pct": progress_pct,
    }


def _llm_output_to_plan_json(parsed: PrepPlanLLMOutput, *, degraded: bool) -> dict[str, Any]:
    data = parsed.model_dump()
    if degraded:
        data["_degraded"] = True
    return data


def _sync_plan_days(
    plan: PrepPlan,
    parsed: PrepPlanLLMOutput,
    *,
    interview_date: date,
    existing_by_day: dict[int, PlanDay] | None = None,
) -> tuple[list[PlanDay], list[PlanDay], list[PlanDay]]:
    by_day = existing_by_day if existing_by_day is not None else {}
    days_count = len(parsed.days)
    seen: set[int] = set()
    result: list[PlanDay] = []
    new_rows: list[PlanDay] = []

    for item in sorted(parsed.days, key=lambda x: x.day_number):
        cal = plan_input.calendar_date_for_day(interview_date, item.day_number, days_count)
        prev = by_day.get(item.day_number)
        seen.add(item.day_number)
        if prev is not None:
            prev.date = cal
            prev.focus_area = item.focus_area.strip()
            prev.morning_task = item.morning_task.strip()
            prev.evening_task = item.evening_task.strip()
            result.append(prev)
        else:
            row = PlanDay(
                plan_id=plan.id,
                day_number=item.day_number,
                date=cal,
                focus_area=item.focus_area.strip(),
                morning_task=item.morning_task.strip(),
                evening_task=item.evening_task.strip(),
            )
            new_rows.append(row)
            result.append(row)

    to_delete = [old for num, old in by_day.items() if num not in seen]
    return result, new_rows, to_delete


async def _plan_days_for_plan(db: AsyncSession, plan_id: uuid.UUID) -> list[PlanDay]:
    stmt = select(PlanDay).where(PlanDay.plan_id == plan_id).order_by(PlanDay.day_number.asc())
    return list((await db.scalars(stmt)).all())


_INITIAL_MODULE_WINDOW = 3
_NOTES_MIN_LINES = 18
_NOTES_MIN_CHARS = 1000


def _initial_generation_days(day_rows: list[PlanDay], today: date) -> list[PlanDay]:
    upcoming = sorted((d for d in day_rows if d.date >= today), key=lambda d: d.day_number)
    return upcoming[:_INITIAL_MODULE_WINDOW]


def _day_overview_extra(plan_json: dict, day_number: int) -> dict[str, Any]:
    for d in plan_json.get("days") or []:
        if isinstance(d, dict) and int(d.get("day_number", 0)) == day_number:
            return d
    return {}


def _notes_modules_too_thin(modules: list[PrepPlanModuleLLMItem]) -> bool:
    for mod in modules:
        if mod.kind != PlanModuleKind.notes.value:
            continue
        content = (mod.content or "").strip()
        line_count = content.count("\n") + 1 if content else 0
        if line_count < _NOTES_MIN_LINES or len(content) < _NOTES_MIN_CHARS:
            return True
    return False


def _persist_day_modules(db: AsyncSession, day_row: PlanDay, modules: list[PrepPlanModuleLLMItem]) -> None:
    for order, mod in enumerate(modules):
        kind = mod.kind
        link = (mod.link_url or "").strip() or None
        if link and len(link) > 2048:
            link = link[:2048]
        topics = mod.quiz_topics if kind == PlanModuleKind.quiz.value else None
        db.add(
            PlanDayModule(
                plan_day_id=day_row.id,
                display_order=order,
                kind=kind,
                title=mod.title.strip(),
                content=(mod.content or "").strip() or None,
                link_url=link,
                quiz_topics=topics,
            )
        )


async def _call_day_modules_llm(
    *,
    experience_level: str,
    plan: PrepPlan,
    day_row: PlanDay,
    day_extra: dict[str, Any],
    resume_summary: str,
    tomorrow_preview: str | None,
    expand_thin: bool,
) -> PrepPlanDayModulesLLMItem:
    user_prompt = prompts.build_day_modules_user_prompt(
        experience_level=experience_level,
        company_name=plan.company_name,
        role=plan.role,
        jd_text=plan.jd_text,
        resume_summary=resume_summary,
        day_number=day_row.day_number,
        focus_area=day_row.focus_area,
        morning_task=day_row.morning_task,
        evening_task=day_row.evening_task,
        quiz_topics=day_extra.get("quiz_topics") or [],
        intensity=day_extra.get("intensity") or "medium",
        tomorrow_preview=tomorrow_preview,
        expand_thin=expand_thin,
    )
    raw, _degraded = await interview_llm.generate_interview_json(
        full_system_prompt=prompts.day_modules_system_prompt(),
        user_prompt=user_prompt,
        response_schema=PrepPlanDayModulesLLMItem,
    )
    return PrepPlanDayModulesLLMItem.model_validate(raw)


async def _generate_day_modules(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    plan: PrepPlan,
    day_row: PlanDay,
    day_rows: list[PlanDay],
    resume: Resume,
    resume_summary: str,
) -> None:
    if day_row.modules_status == PlanDayModulesStatus.ready.value:
        return
    if day_row.modules_status == PlanDayModulesStatus.generating.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Day modules are already being generated.",
        )

    await assert_can_generate_day_modules(db, user_id)

    day_row.modules_status = PlanDayModulesStatus.generating.value
    day_row.modules_error = None
    await db.commit()

    experience_level = normalize_experience_level(resume.experience_level)
    plan_json = plan.plan_json or {}
    day_extra = _day_overview_extra(plan_json, day_row.day_number)
    tomorrow_preview: str | None = None
    next_day = next((d for d in day_rows if d.day_number == day_row.day_number + 1), None)
    if next_day is not None:
        tomorrow_preview = next_day.focus_area.strip()

    try:
        parsed = await _call_day_modules_llm(
            experience_level=experience_level,
            plan=plan,
            day_row=day_row,
            day_extra=day_extra,
            resume_summary=resume_summary,
            tomorrow_preview=tomorrow_preview,
            expand_thin=False,
        )
        if _notes_modules_too_thin(parsed.modules):
            parsed = await _call_day_modules_llm(
                experience_level=experience_level,
                plan=plan,
                day_row=day_row,
                day_extra=day_extra,
                resume_summary=resume_summary,
                tomorrow_preview=tomorrow_preview,
                expand_thin=True,
            )

        await db.execute(delete(PlanDayModule).where(PlanDayModule.plan_day_id == day_row.id))
        _persist_day_modules(db, day_row, parsed.modules)
        day_row.modules_status = PlanDayModulesStatus.ready.value
        day_row.modules_error = None
        day_row.modules_generated_at = datetime.now(UTC)
        await db.commit()
    except HTTPException as exc:
        day_row.modules_status = PlanDayModulesStatus.failed.value
        day_row.modules_error = (
            exc.detail if isinstance(exc.detail, str) else "Module generation failed — try again."
        )
        await db.commit()
        raise
    except Exception as exc:
        log.warning("plan day modules: generation failed day=%s: %s", day_row.day_number, exc)
        day_row.modules_status = PlanDayModulesStatus.failed.value
        day_row.modules_error = "Module generation failed — try again."
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Module generation failed — try again.",
        ) from exc


async def generate_plan(
    db: AsyncSession,
    *,
    clerk_subject: str,
    resume_id: uuid.UUID,
    company_name: str,
    role: str,
    interview_date: date,
    jd_text: str,
    experience_level: str | None,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    await assert_can_generate_plan(db, user.id)

    resume = await require_resume_readable(db, resume_id, clerk_subject)
    interview_date = plan_input.validate_interview_date(interview_date)
    jd_clean = plan_input.validate_jd_text(jd_text)
    company_clean = plan_input.sanitize_text(company_name, max_len=200)
    role_clean = plan_input.sanitize_text(role or resume.target_role, max_len=128)
    exp = normalize_experience_level(experience_level or resume.experience_level)

    days_count = plan_input.compute_days_count(interview_date)
    summary_text = await build_resume_summary(db, resume=resume, resume_id=resume_id)

    settings = get_settings()
    user_prompt = prompts.build_generate_user_prompt(
        experience_level=exp,
        company_name=company_clean,
        role=role_clean,
        interview_date=interview_date.isoformat(),
        days_count=days_count,
        jd_text=jd_clean,
        resume_summary=summary_text,
    )
    raw, degraded = await interview_llm.generate_interview_json(
        full_system_prompt=prompts.generate_system_prompt(),
        user_prompt=user_prompt,
        response_schema=PrepPlanLLMOutput,
    )
    try:
        parsed = PrepPlanLLMOutput.model_validate(raw)
    except Exception as exc:
        log.warning("plan generate: invalid LLM JSON: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Plan generation failed — try again.",
        ) from exc

    if len(parsed.days) > days_count:
        parsed.days = parsed.days[:days_count]
    while len(parsed.days) < days_count:
        n = len(parsed.days) + 1
        template = parsed.days[-1] if parsed.days else None
        parsed.days.append(
            template.model_copy(update={"day_number": n})
            if template
            else PrepPlanDayLLMItem(
                day_number=n,
                focus_area="Review and practice",
                morning_task="Review key topics from the JD.",
                evening_task="Light quiz practice on weak areas.",
                quiz_topics=["review"],
                intensity="light",
            )
        )

    plan_json = _llm_output_to_plan_json(parsed, degraded=degraded)
    plan = PrepPlan(
        user_id=user.id,
        resume_id=resume_id,
        company_name=company_clean,
        role=role_clean,
        interview_date=interview_date,
        jd_text=jd_clean,
        plan_json=plan_json,
        prompt_version=settings.plan_prompt_version,
        status=PrepPlanStatus.active.value,
        phase=PrepPlanPhase.overview.value,
    )
    db.add(plan)
    await db.flush()
    _, new_rows, _ = _sync_plan_days(plan, parsed, interview_date=interview_date)
    for row in new_rows:
        db.add(row)
    await db.commit()
    return await _build_plan_response(db, plan.id)


async def list_plans(
    db: AsyncSession,
    *,
    clerk_subject: str,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    plans = list(
        (
            await db.scalars(
                select(PrepPlan)
                .where(
                    PrepPlan.user_id == user.id,
                    PrepPlan.status != PrepPlanStatus.abandoned.value,
                )
                .order_by(PrepPlan.updated_at.desc())
            )
        ).all()
    )
    plan_ids = [p.id for p in plans]
    progress = await _progress_for_plans(db, plan_ids)
    items = [
        _plan_summary_dict(
            p,
            progress_pct=progress.get(p.id, (0, 0))[0],
            days_count=progress.get(p.id, (0, 0))[1],
        )
        for p in plans
    ]
    return {"plans": items}


async def get_plan(
    db: AsyncSession,
    *,
    clerk_subject: str,
    plan_id: uuid.UUID,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    plan = await _load_plan_owned(db, plan_id, user.id)
    if plan.status == PrepPlanStatus.abandoned.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return await _build_plan_response(db, plan.id)


async def get_active_plan(
    db: AsyncSession,
    *,
    clerk_subject: str,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    plan = await _active_plan_for_user(db, user.id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active plan")
    return await _build_plan_response(db, plan.id)


async def modify_plan(
    db: AsyncSession,
    *,
    clerk_subject: str,
    plan_id: uuid.UUID,
    natural_language_instruction: str,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    await assert_can_modify_plan(db, user.id)
    instruction = plan_input.validate_modify_instruction(natural_language_instruction)

    plan = await _load_plan_owned(db, plan_id, user.id)
    if plan.status != PrepPlanStatus.active.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan is not active")
    if plan.phase != PrepPlanPhase.overview.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan is already in execution — abandon and regenerate to change overview.",
        )

    day_rows = await _plan_days_for_plan(db, plan.id)
    existing_by_day = {d.day_number: d for d in day_rows}
    user_prompt = prompts.build_modify_user_prompt(
        current_plan_json=plan.plan_json,
        natural_language_instruction=instruction,
    )
    raw, degraded = await interview_llm.generate_interview_json(
        full_system_prompt=prompts.modify_system_prompt(),
        user_prompt=user_prompt,
        response_schema=PrepPlanLLMOutput,
    )
    try:
        parsed = PrepPlanLLMOutput.model_validate(raw)
    except Exception as exc:
        log.warning("plan modify: invalid LLM JSON: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Plan update failed — try again.",
        ) from exc

    plan.plan_json = _llm_output_to_plan_json(parsed, degraded=degraded)
    _, new_rows, to_delete = _sync_plan_days(
        plan,
        parsed,
        interview_date=plan.interview_date,
        existing_by_day=existing_by_day,
    )
    for row in new_rows:
        db.add(row)
    for old in to_delete:
        await db.delete(old)
    await db.commit()
    return await _build_plan_response(db, plan.id)


async def initiate_plan(
    db: AsyncSession,
    *,
    clerk_subject: str,
    plan_id: uuid.UUID,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)

    plan = await _load_plan_owned(db, plan_id, user.id)
    if plan.status != PrepPlanStatus.active.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan is not active")
    if plan.phase == PrepPlanPhase.execution.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Plan already initiated.",
        )

    day_rows = await _plan_days_for_plan(db, plan.id)
    resume = await require_resume_readable(db, plan.resume_id, clerk_subject)
    summary_text = await build_resume_summary(db, resume=resume, resume_id=plan.resume_id)

    plan.phase = PrepPlanPhase.execution.value
    await db.commit()

    today = _utc_today()
    initial_days = _initial_generation_days(day_rows, today)
    for day_row in initial_days:
        if day_row.modules_status == PlanDayModulesStatus.ready.value:
            continue
        try:
            await _generate_day_modules(
                db,
                user_id=user.id,
                plan=plan,
                day_row=day_row,
                day_rows=day_rows,
                resume=resume,
                resume_summary=summary_text,
            )
        except HTTPException as exc:
            log.warning(
                "plan initiate: day %s generation failed: %s",
                day_row.day_number,
                exc.detail,
            )

    return await _build_plan_response(db, plan.id)


async def generate_plan_day_modules(
    db: AsyncSession,
    *,
    clerk_subject: str,
    day_id: uuid.UUID,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    day_row = await db.scalar(
        select(PlanDay)
        .where(PlanDay.id == day_id)
        .options(selectinload(PlanDay.plan))
    )
    if day_row is None or day_row.plan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found")

    plan = day_row.plan
    if plan.status != PrepPlanStatus.active.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan is not active")
    if plan.phase != PrepPlanPhase.execution.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan must be initiated before generating day modules.",
        )
    if day_row.modules_status == PlanDayModulesStatus.ready.value:
        return await _build_plan_response(db, plan.id)

    resume = await require_resume_readable(db, plan.resume_id, clerk_subject)
    summary_text = await build_resume_summary(db, resume=resume, resume_id=plan.resume_id)
    day_rows = await _plan_days_for_plan(db, plan.id)

    await _generate_day_modules(
        db,
        user_id=user.id,
        plan=plan,
        day_row=day_row,
        day_rows=day_rows,
        resume=resume,
        resume_summary=summary_text,
    )
    return await _build_plan_response(db, plan.id)


async def _rollup_plan_completion_after_module_change(
    db: AsyncSession,
    *,
    day: PlanDay,
    plan: PrepPlan,
) -> None:
    day_rows = await _plan_days_for_plan(db, day.plan_id)
    modules_by_day = await _modules_for_days(db, [d.id for d in day_rows])
    day_mods = modules_by_day.get(day.id, [])
    day.completed = bool(day_mods) and all(m.completed for m in day_mods)

    all_days_done = True
    for d in day_rows:
        mods = modules_by_day.get(d.id, [])
        if mods and not all(m.completed for m in mods):
            all_days_done = False
            break
    if all_days_done and day_rows:
        plan.status = PrepPlanStatus.completed.value


async def sync_plan_module_after_quiz_score(
    db: AsyncSession,
    session_id: uuid.UUID,
    *,
    plan_module_id: uuid.UUID | None = None,
) -> None:
    """Mark linked plan module complete when its interview session is scored."""
    row = await db.scalar(
        select(PlanDayModule)
        .where(PlanDayModule.quiz_session_id == session_id)
        .options(selectinload(PlanDayModule.plan_day).selectinload(PlanDay.plan))
    )
    if row is None and plan_module_id is not None:
        row = await db.scalar(
            select(PlanDayModule)
            .where(PlanDayModule.id == plan_module_id)
            .options(selectinload(PlanDayModule.plan_day).selectinload(PlanDay.plan))
        )

    if row is None:
        return

    if row.quiz_session_id != session_id:
        row.quiz_session_id = session_id

    if not row.completed:
        row.completed = True
        row.completed_at = datetime.now(UTC)
        await _rollup_plan_completion_after_module_change(
            db, day=row.plan_day, plan=row.plan_day.plan
        )


async def complete_plan_module(
    db: AsyncSession,
    *,
    clerk_subject: str,
    module_id: uuid.UUID,
    completed: bool | None = None,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    row = await db.scalar(
        select(PlanDayModule)
        .where(PlanDayModule.id == module_id)
        .options(selectinload(PlanDayModule.plan_day).selectinload(PlanDay.plan))
    )
    if row is None or row.plan_day.plan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    new_val = not row.completed if completed is None else completed
    row.completed = new_val
    row.completed_at = datetime.now(UTC) if new_val else None

    day = row.plan_day
    plan = day.plan
    await _rollup_plan_completion_after_module_change(db, day=day, plan=plan)

    plan_id = plan.id
    await db.commit()
    return await _build_plan_response(db, plan_id)


async def link_plan_module_quiz(
    db: AsyncSession,
    *,
    clerk_subject: str,
    module_id: uuid.UUID,
    session_id: uuid.UUID,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    row = await db.scalar(
        select(PlanDayModule)
        .where(PlanDayModule.id == module_id)
        .options(selectinload(PlanDayModule.plan_day).selectinload(PlanDay.plan))
    )
    if row is None or row.plan_day.plan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    row.quiz_session_id = session_id
    plan_id = row.plan_day.plan_id
    await db.commit()
    return await _build_plan_response(db, plan_id)


async def complete_plan_day(
    db: AsyncSession,
    *,
    clerk_subject: str,
    day_id: uuid.UUID,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    row = await db.scalar(
        select(PlanDay)
        .where(PlanDay.id == day_id)
        .options(selectinload(PlanDay.plan))
    )
    if row is None or row.plan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found")

    row.completed = True
    plan = row.plan
    day_rows = await _plan_days_for_plan(db, plan.id)
    if all(d.completed for d in day_rows):
        plan.status = PrepPlanStatus.completed.value
    plan_id = plan.id
    await db.commit()
    return await _build_plan_response(db, plan_id)


async def link_plan_day_quiz(
    db: AsyncSession,
    *,
    clerk_subject: str,
    day_id: uuid.UUID,
    session_id: uuid.UUID,
) -> dict[str, Any]:
    user = await require_user_for_clerk(db, clerk_subject)
    row = await db.scalar(
        select(PlanDay)
        .where(PlanDay.id == day_id)
        .options(selectinload(PlanDay.plan))
    )
    if row is None or row.plan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found")

    row.quiz_session_id = session_id
    plan_id = row.plan_id
    await db.commit()
    return await _build_plan_response(db, plan_id)


async def abandon_plan(
    db: AsyncSession,
    *,
    clerk_subject: str,
    plan_id: uuid.UUID,
) -> dict[str, str]:
    user = await require_user_for_clerk(db, clerk_subject)
    plan = await _load_plan_owned(db, plan_id, user.id)
    plan.status = PrepPlanStatus.abandoned.value
    await db.commit()
    return {"status": "abandoned", "id": str(plan.id)}


async def subscribe_push(
    db: AsyncSession,
    *,
    clerk_subject: str,
    subscription: dict[str, Any],
) -> dict[str, str]:
    user = await require_user_for_clerk(db, clerk_subject)
    endpoint = str(subscription.get("endpoint") or "").strip()
    if not endpoint or len(endpoint) > 2048:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subscription")

    keys = subscription.get("keys")
    if not isinstance(keys, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subscription")

    existing = await db.scalar(
        select(PushSubscription).where(
            PushSubscription.user_id == user.id,
            PushSubscription.endpoint == endpoint,
        )
    )
    if existing is not None:
        existing.subscription_json = subscription
    else:
        db.add(
            PushSubscription(
                user_id=user.id,
                endpoint=endpoint,
                subscription_json=subscription,
            )
        )
    await db.commit()
    return {"status": "subscribed"}


async def get_active_plans_for_push(db: AsyncSession, *, on_date: date) -> list[tuple[PrepPlan, PlanDay]]:
    stmt = (
        select(PrepPlan, PlanDay)
        .join(PlanDay, PlanDay.plan_id == PrepPlan.id)
        .where(
            PrepPlan.status == PrepPlanStatus.active.value,
            PrepPlan.phase == PrepPlanPhase.execution.value,
            PlanDay.date == on_date,
            PlanDay.completed.is_(False),
        )
    )
    return list((await db.execute(stmt)).all())
