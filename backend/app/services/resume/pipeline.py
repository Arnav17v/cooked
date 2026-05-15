"""Background pipeline: single LLM call → score, flags, interview questions."""

from __future__ import annotations

import logging
import uuid
from datetime import date

from sqlalchemy import delete

from app.core.config import get_settings
from app.db.session import SessionFactory
from app.models.analysis import Analysis
from app.models.question import Question
from app.models.resume import Resume
from app.models.user import User
from app.schemas.llm_outputs import SectionVerdictsObj
from app.services.resume.analyzer import roast_resume_with_llm

log = logging.getLogger(__name__)


async def run_analysis_pipeline(analysis_id: uuid.UUID) -> None:
    settings = get_settings()
    async with SessionFactory() as session:
        analysis = await session.get(Analysis, analysis_id)
        if analysis is None:
            log.error("pipeline: analysis %s not found", analysis_id)
            return

        resume = await session.get(Resume, analysis.resume_id)
        if resume is None or not (resume.raw_text or "").strip():
            analysis.status = "failed"
            analysis.pipeline_stage = None
            analysis.failure_reason = "no_resume_text"
            await session.commit()
            log.error("pipeline: resume missing or empty for analysis %s", analysis_id)
            return

        user = await session.get(User, resume.user_id)
        if user is None:
            analysis.status = "failed"
            analysis.pipeline_stage = None
            analysis.failure_reason = "no_user"
            await session.commit()
            return

        wc = len((resume.raw_text or "").split())
        if wc < settings.min_roast_words:
            analysis.status = "failed"
            analysis.pipeline_stage = None
            analysis.failure_reason = "too_short"
            await session.commit()
            return

        analysis.status = "processing"
        analysis.prompt_version = settings.prompt_version
        analysis.pipeline_stage = "extracting"
        analysis.failure_reason = None
        await session.commit()

        analysis.pipeline_stage = "scoring"
        await session.commit()

        text = resume.raw_text or ""

        try:
            out, llm_res, err = await roast_resume_with_llm(
                text,
                resume.target_role,
                max_output_tokens=settings.llm_max_output_tokens,
            )

            if err or out is None:
                analysis.status = "failed"
                analysis.pipeline_stage = None
                analysis.failure_reason = err or "models_unavailable"
                analysis.cooked_score = None
                analysis.one_liner = None
                analysis.model_used = llm_res.provider if llm_res else None
                if llm_res and llm_res.failure_debug:
                    analysis.score_breakdown = {"failure_debug": llm_res.failure_debug}
                await session.commit()
                return

            # Cosmetic SSE steps (single LLM call already produced flags + questions)
            analysis.pipeline_stage = "flagging"
            await session.commit()

            analysis.pipeline_stage = "questions"
            await session.commit()

            sv = out.section_verdicts
            if isinstance(sv, SectionVerdictsObj):
                sv_dict = sv.model_dump()
            elif isinstance(sv, dict):
                sv_dict = dict(sv)
            else:
                sv_dict = {}

            heat = out.heat_label
            breakdown = {
                "heat_label": heat,
                "headline": out.one_liner,
                "one_liner": out.one_liner,
                "section_verdicts": sv_dict,
            }
            if llm_res.degraded:
                breakdown["analyze_degraded"] = True

            analysis.cooked_score = out.score
            analysis.one_liner = out.one_liner
            analysis.model_used = llm_res.provider
            analysis.section_verdicts = sv_dict
            analysis.score_breakdown = breakdown
            analysis.red_flags = [f.model_dump() for f in out.flags[:5]]
            analysis.rewritten_bullets = []
            analysis.interview_questions = [
                {
                    "question": q.question,
                    "bucket": q.bucket,
                    "source_bullet": q.source_bullet,
                    "category": "interview",
                    "difficulty": "Medium",
                }
                for q in out.questions
            ]
            analysis.prompt_version = llm_res.prompt_version or settings.prompt_version

            await session.execute(delete(Question).where(Question.analysis_id == analysis.id))
            for q in out.questions:
                session.add(
                    Question(
                        analysis_id=analysis.id,
                        question=q.question,
                        category="interview",
                        source_bullet=q.source_bullet or None,
                        difficulty="Medium",
                        question_bucket=q.bucket if q.bucket in ("from_resume", "gap") else "from_resume",
                    )
                )

            analysis.status = "done"
            analysis.pipeline_stage = None
            analysis.failure_reason = None

            today = date.today()
            if user.last_analysis_date != today:
                user.analyses_today = 0
                user.last_analysis_date = today
            user.analyses_today += 1

            await session.commit()
        except Exception:
            log.exception("pipeline failed for analysis %s", analysis_id)
            analysis.status = "failed"
            analysis.pipeline_stage = None
            analysis.failure_reason = "pipeline_error"
            await session.commit()
