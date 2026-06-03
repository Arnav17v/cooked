"""On-demand in-depth analysis — separate from roast bundle."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis
from app.models.prep_plan import PrepPlan
from app.models.resume import Resume
from app.schemas.indepth_outputs import InDepthAnalysisOutput
from app.services.llm.errors import RecoverableLLMError
from app.services.llm.router import LLMRouter
from app.services.resume.indepth_prompts import (
    INDEPTH_PROMPT_VERSION,
    build_indepth_user_prompt,
    indepth_system_prompt,
)
from app.services.resume.llm_input import normalize_whitespace, truncate_resume_for_llm

log = logging.getLogger(__name__)


async def _latest_jd_for_resume(session: AsyncSession, resume_id) -> str | None:
    stmt = (
        select(PrepPlan.jd_text)
        .where(PrepPlan.resume_id == resume_id)
        .order_by(PrepPlan.created_at.desc())
        .limit(1)
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if not row:
        return None
    text = (row or "").strip()
    return text or None


async def generate_indepth_analysis(
    session: AsyncSession,
    analysis: Analysis,
    resume: Resume,
    *,
    job_description: str | None = None,
) -> tuple[InDepthAnalysisOutput, bool]:
    """Run LLM and return (validated output, degraded). Raises RecoverableLLMError."""
    raw_text = (resume.raw_text or "").strip()
    if not raw_text:
        raise ValueError("resume has no text")

    clean = normalize_whitespace(raw_text)
    body_for_llm, _ = truncate_resume_for_llm(clean)

    jd = (job_description or "").strip()
    if not jd:
        jd = await _latest_jd_for_resume(session, resume.id) or "Not provided"

    user_prompt = build_indepth_user_prompt(
        experience_level=resume.experience_level,
        target_role=resume.target_role,
        resume_for_llm=body_for_llm,
        job_description=jd,
    )

    router = LLMRouter()
    result = await router.call(
        task="analyze",
        system_prompt=indepth_system_prompt(),
        user_prompt=user_prompt,
        response_schema=InDepthAnalysisOutput,
        max_output_tokens=8192,
    )

    if not isinstance(result.content, dict):
        raise RecoverableLLMError("indepth: models unavailable")

    if result.content.get("error") == "both_providers_unavailable":
        raise RecoverableLLMError("indepth: models unavailable")

    try:
        out = InDepthAnalysisOutput.model_validate(result.content)
    except ValidationError as e:
        log.warning("indepth JSON validation failed: %s", e)
        raise RecoverableLLMError("indepth: invalid LLM payload") from e

    return out, result.degraded


def persist_indepth(
    analysis: Analysis,
    out: InDepthAnalysisOutput,
    *,
    degraded: bool,
) -> dict[str, object]:
    payload = out.model_dump()
    payload["_prompt_version"] = INDEPTH_PROMPT_VERSION
    payload["analyze_degraded"] = degraded
    analysis.indepth_analysis = payload
    analysis.indepth_generated_at = datetime.now(UTC)
    return payload
