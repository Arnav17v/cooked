"""Resume upload, analyze kickoff, SSE progress."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid

from botocore.exceptions import ClientError
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.api.deps_auth import optional_clerk_subject
from app.core.config import get_settings
from app.core.storage import delete_object_key, r2_configured, upload_resume_pdf
from app.db.session import SessionFactory, get_session
from app.models.analysis import Analysis
from app.models.resume import Resume
from app.models.user import User
from app.schemas.interview_quiz_scores import (
    MAX_QUIZ_SCORE_HISTORY,
    normalize_interview_quiz_scores,
)
from app.services.llm.dev_trace import clear_llm_dev_trace, drain_llm_dev_events
from app.services.resume.experience_level import normalize_experience_level
from app.services.resume.parser import ParsedResume, parse_pdf, parse_text, validate_min_words
from app.services.resume.pipeline import run_analysis_pipeline
from app.services.resume.retention import prune_analyses_for_user
from app.services.share.slug import allocate_share_slug
from app.services.users.access import assert_resume_owned_if_authenticated
from app.services.users.bootstrap import resolve_upload_user
from app.services.users.limits import reset_daily_counter_if_new_day

log = logging.getLogger(__name__)

router = APIRouter(prefix="/resume", tags=["resume"])

_MAX_UPLOAD_BYTES = 12 * 1024 * 1024


def _preview(text: str, *, max_len: int = 320) -> str:
    t = " ".join(text.split())
    if len(t) <= max_len:
        return t
    return t[: max_len - 1] + "…"


@router.post("/upload")
async def upload_resume(
    session: AsyncSession = Depends(get_session),  # noqa: B008
    target_role: str = Form(...),
    experience_level: str = Form(...),
    resume_text: str | None = Form(None),
    file: UploadFile | None = File(None),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
    x_cooked_anonymous_id: str | None = Header(default=None, alias="X-Cooked-Anonymous-Id"),
) -> dict[str, object]:
    role = target_role.strip()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_role is required",
        )
    try:
        exp_level = normalize_experience_level(experience_level)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid experience_level",
        ) from None

    user = await resolve_upload_user(
        session,
        clerk_subject,
        anonymous_client_key=x_cooked_anonymous_id,
    )
    prev_resume = await session.scalar(
        select(Resume)
        .where(Resume.user_id == user.id)
        .order_by(Resume.created_at.desc())
        .limit(1)
    )
    carried_quiz_scores: list | None = None
    if prev_resume is not None:
        carried_quiz_scores = normalize_interview_quiz_scores(prev_resume.interview_quiz_scores)[
            -MAX_QUIZ_SCORE_HISTORY:
        ]
    await session.execute(delete(Resume).where(Resume.user_id == user.id))

    resume = Resume(
        user_id=user.id,
        raw_text=None,
        file_url=None,
        target_role=role[:128],
        experience_level=exp_level,
        interview_quiz_scores=carried_quiz_scores if carried_quiz_scores else None,
    )
    session.add(resume)
    await session.flush()

    parsed: ParsedResume | None = None
    file_key: str | None = None

    if file is not None and (file.filename or "").strip():
        if not r2_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="PDF uploads require R2 storage to be configured",
            )
        body = await file.read()
        n_raw = len(body)
        pdf_magic = body[:5] == b"%PDF-" if n_raw >= 5 else False
        log.info(
            "resume.upload_smoke filename=%r content_type=%r bytes=%s pdf_magic_ok=%s",
            file.filename,
            file.content_type,
            n_raw,
            pdf_magic,
        )
        if len(body) > _MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="PDF too large",
            )
        ctype = file.content_type or "application/pdf"
        filename = (file.filename or "").lower()
        if "pdf" not in ctype.lower() and not filename.endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported",
            )
        parsed = parse_pdf(body)
        log.info(
            "resume.upload_smoke after_parse resume_id=%s bytes=%s word_count=%s truncated=%s",
            resume.id,
            len(body),
            parsed.word_count,
            parsed.truncated,
        )
        try:
            validate_min_words(parsed.word_count)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="too short to roast",
            ) from None

        try:
            file_key = upload_resume_pdf(
                resume_id=resume.id,
                data=body,
                content_type=ctype,
            )
        except ClientError as e:
            err = e.response.get("Error", {}) if hasattr(e, "response") else {}
            err_code = err.get("Code")
            log.warning(
                "resume.upload_smoke put_object failed code=%s message=%s request_id=%s exc=%s",
                err_code,
                err.get("Message"),
                e.response.get("ResponseMetadata", {}).get("RequestId")
                if hasattr(e, "response")
                else None,
                e,
            )
            # Text was already parsed from memory; B2 sometimes still fails PutObject (IncompleteBody).
            if err_code == "IncompleteBody":
                log.warning(
                    "resume.upload: storage PutObject IncompleteBody — saving text-only, no PDF key",
                )
                file_key = None
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Could not store the PDF — check storage credentials, region, and bucket encryption settings",
                ) from e
        # Spec: delete stored PDF after text extraction; text was parsed from bytes in memory
        delete_object_key(file_key)
        file_key = None
    elif resume_text is not None and resume_text.strip():
        parsed = parse_text(resume_text)
        try:
            validate_min_words(parsed.word_count)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="too short to roast",
            ) from None
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide resume_text or upload a PDF file",
        )

    resume.raw_text = parsed.text
    resume.file_url = file_key
    await session.commit()
    await session.refresh(resume)

    return {
        "resume_id": str(resume.id),
        "truncated": parsed.truncated,
        "word_count": parsed.word_count,
        "extracted_text_preview": _preview(parsed.text),
    }


async def enqueue_analysis_for_resume(
    resume_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    session: AsyncSession,
    clerk_subject: str | None = None,
) -> dict[str, str]:
    """Shared enqueue used by `/resume/{id}/analyze` and `POST /api/v1/analyze`."""
    resume = await session.get(Resume, resume_id)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="resume not found")

    await assert_resume_owned_if_authenticated(session, resume, clerk_subject)

    user = await session.get(User, resume.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")

    settings = get_settings()
    reset_daily_counter_if_new_day(user)
    if not settings.unlimited_daily_roasts and user.analyses_today >= settings.daily_analysis_cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily roast limit reached ({settings.daily_analysis_cap} per day) — try again tomorrow.",
        )

    if not (resume.raw_text or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text is empty (expired or not uploaded)",
        )

    wc = len((resume.raw_text or "").split())
    if wc < settings.min_roast_words:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="too short to roast",
        )

    slug = await allocate_share_slug(session)
    analysis = Analysis(
        resume_id=resume.id,
        share_slug=slug,
        cooked_score=None,
        score_breakdown=None,
        red_flags=None,
        rewritten_bullets=None,
        prompt_version=settings.prompt_version,
        status="pending",
    )
    session.add(analysis)
    await prune_analyses_for_user(session, user.id)
    await session.commit()
    await session.refresh(analysis)

    background_tasks.add_task(run_analysis_pipeline, analysis.id)

    return {
        "analysis_id": str(analysis.id),
        "resume_id": str(resume.id),
        "share_slug": slug,
    }


@router.post("/{resume_id}/analyze")
async def enqueue_analysis(
    resume_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    clerk_subject: str | None = Depends(optional_clerk_subject),
) -> dict[str, str]:
    return await enqueue_analysis_for_resume(resume_id, background_tasks, session, clerk_subject)


def _failure_reason_sse(reason: str | None) -> str:
    m = {
        "too_short": "too_short",
        "models_unavailable": "models_unavailable",
        "invalid_llm_payload": "invalid_llm_payload",
        "no_resume_text": "models_unavailable",
        "pipeline_error": "models_unavailable",
    }
    return m.get(reason or "", reason or "unknown")


def _truncate_sse_debug(d: dict[str, object], *, max_str: int = 24_000) -> dict[str, object]:
    out: dict[str, object] = {}
    for k, v in d.items():
        if isinstance(v, str) and len(v) > max_str:
            out[k] = v[:max_str] + f"... [truncated, total_len={len(v)}]"
        else:
            out[k] = v
    return out


@router.get("/{resume_id}/analysis/{analysis_id}/events")
async def analysis_events(resume_id: uuid.UUID, analysis_id: uuid.UUID) -> StreamingResponse:
    settings = get_settings()
    aid = str(analysis_id)

    async def gen():
        last_llm_idx = 0
        while True:
            async with SessionFactory() as session:
                analysis = await session.get(Analysis, analysis_id)
                if analysis is None or analysis.resume_id != resume_id:
                    yield f"data: {json.dumps({'step': 'error', 'reason': 'not_found'})}\n\n"
                    break

                if settings.dev:
                    new_events, last_llm_idx = drain_llm_dev_events(aid, last_llm_idx)
                    for ev in new_events:
                        yield f"data: {json.dumps({'step': 'llm_dev', **ev})}\n\n"

                step_payload: dict[str, object]
                if analysis.status == "pending":
                    step_payload = {"step": "extracting"}
                elif analysis.status == "processing":
                    ps = analysis.pipeline_stage or "scoring"
                    step_payload = {"step": ps}
                elif analysis.status == "done":
                    bd = analysis.score_breakdown or {}
                    step_payload = {
                        "step": "done",
                        "resume_id": str(resume_id),
                        "share_slug": analysis.share_slug,
                        "cooked_score": analysis.cooked_score,
                        "heat_label": bd.get("heat_label"),
                        "headline": analysis.one_liner or bd.get("headline"),
                        "degraded": bool(bd.get("analyze_degraded") or bd.get("degraded")),
                    }
                elif analysis.status == "failed":
                    step_payload = {
                        "step": "error",
                        "reason": _failure_reason_sse(analysis.failure_reason),
                    }
                    if settings.sse_includes_llm_failure_debug:
                        bd = analysis.score_breakdown
                        if isinstance(bd, dict):
                            fd = bd.get("failure_debug")
                            if isinstance(fd, dict):
                                step_payload["failure_debug"] = _truncate_sse_debug(
                                    dict(fd)
                                )
                else:
                    step_payload = {"step": "extracting"}

                yield f"data: {json.dumps(step_payload)}\n\n"

                if analysis.status in ("done", "failed"):
                    if settings.dev:
                        clear_llm_dev_trace(aid)
                    break
            await asyncio.sleep(0.35)

    return StreamingResponse(gen(), media_type="text/event-stream")
