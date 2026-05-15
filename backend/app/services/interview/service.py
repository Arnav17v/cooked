"""Interview session orchestration (DB + prompts + LLM)."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.interview_session import InterviewSession
from app.models.resume import Resume
from app.models.resume_note import NotesSection, ResumeNote, SectionQuizTag
from app.schemas.interview_quiz_scores import (
    MAX_QUIZ_SCORE_HISTORY,
    normalize_interview_quiz_scores,
)
from app.services.interview import llm as interview_llm
from app.services.interview.prompts import (
    build_batch_questions_user_prompt,
    build_batch_score_system_prompt,
    build_batch_score_user_prompt,
    build_interview_system_prompt,
    build_question_bank_system_prompt,
    build_turn_user_prompt,
)
from app.services.notes.section_refs import hydrate_question_section_refs, resolve_note_section_id
from app.services.notes.service import (
    WEAK_SCORE_THRESHOLD,
    load_study_notes_for_prompt,
    set_prep_note_weak_flags_for_resume,
    weak_section_ids_from_session_quiz_tags,
)
from app.services.users.access import require_resume_readable
from app.services.users.limits import assert_can_start_quiz

log = logging.getLogger(__name__)

# Adaptive (turn-by-turn) interview length — separate from static batch quiz size in Settings.
_ADAPTIVE_SESSION_TURNS = 10


def _append_interview_quiz_score(resume: Resume, final_score: int) -> None:
    prev = normalize_interview_quiz_scores(resume.interview_quiz_scores)
    prev.append(
        {
            "final_score": max(0, min(100, int(final_score))),
            "at": datetime.now(UTC).isoformat(),
        },
    )
    resume.interview_quiz_scores = prev[-MAX_QUIZ_SCORE_HISTORY:]


def _heat_label_from_final(score: int) -> str:
    s = max(0, min(100, score))
    if s >= 75:
        return "Raw"
    if s >= 55:
        return "Medium"
    if s >= 35:
        return "Hard"
    return "Cooked"


def _clamp_grade(raw: object) -> int:
    try:
        x = int(float(raw))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 5
    return max(1, min(10, x))


def _norm_diff(raw: object) -> str:
    s = str(raw or "").strip().lower()
    if s in ("easy", "medium", "hard"):
        return s
    return "medium"


def _norm_bucket(raw: object) -> str:
    s = str(raw or "").strip().lower()
    if s in ("from_resume", "gap", "system_design"):
        return s
    return "from_resume"


def _as_str(v: object | None) -> str | None:
    if v is None:
        return None
    t = str(v).strip()
    return t or None


def _parse_optional_section_id(val: object) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in ("null", "none"):
        return None
    try:
        return str(uuid.UUID(s))
    except ValueError:
        return None


def _as_note_tag(val: object) -> str | None:
    if val is None:
        return None
    t = str(val).strip()
    if not t or t.lower() in ("null", "none"):
        return None
    return t[:200]


def _pending_from_dict(data: dict[str, Any], *, difficulty_default: str) -> dict[str, Any]:
    return {
        "question": str(data.get("question") or "").strip() or "What did you ship last?",
        "difficulty": _norm_diff(data.get("difficulty") or difficulty_default),
        "bucket": _norm_bucket(data.get("bucket")),
        "source_bullet": _as_str(data.get("source_bullet")),
        "source_note_section_id": _parse_optional_section_id(data.get("source_note_section_id")),
        "source_note_section_tag": _as_note_tag(data.get("source_note_section_tag")),
    }


def _clamp_score_final(raw: object) -> int:
    try:
        x = int(float(raw))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 50
    return max(0, min(100, x))


def _numeric_from_signal(sig: str) -> int:
    if sig == "green":
        return 8
    if sig == "red":
        return 3
    return 5


def _norm_answer_signal(raw: object) -> str:
    """Map model output to red | yellow | green."""
    s = str(raw or "").strip().lower()
    if not s:
        return "yellow"
    if s in ("green", "g", "strong", "good"):
        return "green"
    if s in ("red", "r", "bad", "weak"):
        return "red"
    if s in ("yellow", "amber", "y", "mixed", "ok", "okay", "moderate"):
        return "yellow"
    if "red" in s:
        return "red"
    if "green" in s and "yellow" not in s:
        return "green"
    if "yellow" in s or "amber" in s:
        return "yellow"
    return "yellow"


def _answer_excerpt(text: str, *, max_chars: int = 200) -> str:
    t = text.strip().replace("\n", " ").strip()
    if len(t) <= max_chars:
        return t
    return t[: max_chars - 1].rstrip() + "…"


def _normalize_per_answer(raw: object, answers: list[str], *, expected: int) -> list[dict[str, Any]]:
    """Build ``expected`` per-answer feedback rows aligned with submission order."""
    by_n: dict[int, dict[str, Any]] = {}
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            try:
                n = int(float(item.get("n")))
            except (TypeError, ValueError):
                continue
            if not 1 <= n <= expected:
                continue
            ana = str(item.get("analysis") or "").strip()
            quote = str(item.get("highlight_quote") or "").strip()
            sig = _norm_answer_signal(item.get("signal"))
            ns_raw = item.get("numeric_score")
            if ns_raw is not None:
                try:
                    numeric = max(1, min(10, int(float(ns_raw))))
                except (TypeError, ValueError):
                    numeric = _numeric_from_signal(sig)
            else:
                numeric = _numeric_from_signal(sig)
            by_n[n] = {
                "n": n,
                "signal": sig,
                "numeric_score": numeric,
                "highlight_quote": quote[:500],
                "analysis": ana[:7000],
            }

    if len(by_n) < expected:
        log.warning(
            "interview score: incomplete per_answer from model (%s of %s keys)",
            len(by_n),
            expected,
        )

    out: list[dict[str, Any]] = []
    for i in range(1, expected + 1):
        ans = answers[i - 1] if i <= len(answers) else ""
        if i not in by_n:
            excerpt = _answer_excerpt(ans)
            out.append(
                {
                    "n": i,
                    "signal": "yellow",
                    "numeric_score": _numeric_from_signal("yellow"),
                    "highlight_quote": excerpt,
                    "analysis": (
                        "No per-answer feedback was returned for this question. "
                        "Review your wording for specifics, metrics, and alignment with what you claimed on your resume."
                    ),
                },
            )
            continue
        row = dict(by_n[i])
        if not row["analysis"]:
            row["analysis"] = (
                "The model omitted detailed commentary here. Ask yourself whether this answer "
                "was concrete enough for a skeptical interviewer."
            )
        hq = row.get("highlight_quote") or ""
        if not hq and ans.strip():
            row["highlight_quote"] = _answer_excerpt(ans)
        out.append(row)
    return out


async def _maybe_record_section_quiz_tag(
    session: AsyncSession,
    *,
    resume_id: uuid.UUID,
    interview_session_id: uuid.UUID,
    section_id_str: str | None,
    question: str,
    score_1_to_10: int,
    what_they_missed: str | None,
) -> None:
    if not section_id_str:
        return
    try:
        sid = uuid.UUID(str(section_id_str).strip())
    except (TypeError, ValueError):
        return
    chk = await session.execute(
        select(NotesSection.section_id)
        .join(ResumeNote, NotesSection.notes_id == ResumeNote.notes_id)
        .where(NotesSection.section_id == sid, ResumeNote.resume_id == resume_id)
    )
    if chk.scalar_one_or_none() is None:
        return
    session.add(
        SectionQuizTag(
            session_id=interview_session_id,
            section_id=sid,
            question=question[:8000],
            score=max(1, min(10, int(score_1_to_10))),
            what_they_missed=what_they_missed,
        )
    )


def _normalize_question_batch(raw: object, expected: int) -> list[dict[str, Any]]:
    if not isinstance(raw, list) or len(raw) != expected:
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            return []
        out.append(_pending_from_dict(item, difficulty_default="medium"))
    return out


def _build_start_response_from_session(inv: InterviewSession, *, batch_n: int) -> dict[str, object] | None:
    """Build `/interview/start` payload from an existing static batch row, or ``None`` if corrupt."""
    pq = inv.pending_question
    if not isinstance(pq, dict) or pq.get("kind") != "static":
        return None
    qs = pq.get("questions")
    if not isinstance(qs, list) or len(qs) != batch_n:
        return None
    pub: list[dict[str, object]] = []
    for qd in qs:
        if not isinstance(qd, dict):
            return None
        q = _pending_from_dict(qd, difficulty_default="medium")
        item: dict[str, object] = {
            "question": q["question"],
            "difficulty": q["difficulty"],
            "bucket": q["bucket"],
            "source_note_section_id": q.get("source_note_section_id"),
        }
        if q.get("source_note_section_tag"):
            item["source_note_section_tag"] = q["source_note_section_tag"]
        pub.append(item)
    return {"session_id": str(inv.id), "questions": pub}


async def _try_reuse_incomplete_batch_session(
    session: AsyncSession,
    *,
    resume_id: uuid.UUID,
    role: str,
    clerk_subject: str | None,
    hard_mode: bool,
    batch_n: int,
) -> dict[str, object] | None:
    """If an in-progress static batch exists for the same resume + role + auth, return it.

    Prevents ``POST /interview/start`` from deleting the row a quiz tab is still
    scoring (double tab, Strict Mode double-mount, or “quiz me” clicked twice).
    """
    row = await session.scalar(
        select(InterviewSession)
        .where(
            InterviewSession.resume_id == resume_id,
            InterviewSession.completed_at.is_(None),
        )
        .order_by(InterviewSession.created_at.desc())
        .limit(1)
        .with_for_update()
    )
    if row is None:
        return None
    if (row.role or "").strip() != role.strip():
        return None
    if bool(row.hard_mode) != bool(hard_mode):
        return None
    uid = row.user_id
    if (uid or "") != (clerk_subject or ""):
        return None
    out = _build_start_response_from_session(row, batch_n=batch_n)
    if out is None:
        return None
    log.info(
        "interview start: reusing in-progress session %s for resume %s (avoid duplicate start wipe)",
        row.id,
        resume_id,
    )
    return out


async def _pg_advisory_lock_resume(session: AsyncSession, resume_id: uuid.UUID) -> None:
    """Serialize ``start_session`` per resume when using PostgreSQL."""
    bind = session.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return
    k = resume_id.int % (2**31 - 1)
    if k == 0:
        k = 1
    await session.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": k})


async def start_session(
    session: AsyncSession,
    *,
    resume_id: uuid.UUID,
    role: str,
    clerk_subject: str | None,
    hard_mode: bool,
) -> dict[str, object]:
    r = role.strip()
    if not r:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="role is required")

    resume = await require_resume_readable(session, resume_id, clerk_subject)
    text = (resume.raw_text or "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Resume text is no longer available; upload again.",
        )

    batch_n = get_settings().interview_batch_question_count

    await _pg_advisory_lock_resume(session, resume.id)
    reused = await _try_reuse_incomplete_batch_session(
        session,
        resume_id=resume.id,
        role=r,
        clerk_subject=clerk_subject,
        hard_mode=hard_mode,
        batch_n=batch_n,
    )
    if reused is not None:
        return reused

    await assert_can_start_quiz(session, resume.user_id)

    study = await load_study_notes_for_prompt(session, resume.id)

    system = build_question_bank_system_prompt(
        resume_text=text,
        role=r,
        hard_mode=hard_mode,
        question_count=batch_n,
        study_notes=study,
    )
    user = build_batch_questions_user_prompt(
        question_count=batch_n,
        include_note_tagging=study is not None,
    )

    data, _ = await interview_llm.generate_interview_json(
        full_system_prompt=system,
        user_prompt=user,
    )
    raw_list = data.get("questions")
    ten = _normalize_question_batch(raw_list, batch_n)
    if len(ten) != batch_n:
        log.warning(
            "interview start: expected %s questions — got %s keys=%s",
            batch_n,
            type(raw_list).__name__,
            list(data.keys()),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Interview model returned an invalid question set",
        )

    if study is not None:
        await hydrate_question_section_refs(session, resume_id=resume.id, questions=ten)

    bank: dict[str, Any] = {"kind": "static", "questions": ten}

    # Drop finished sessions only — never delete an in-progress row another tab may be scoring.
    await session.execute(
        delete(InterviewSession).where(
            InterviewSession.resume_id == resume.id,
            InterviewSession.completed_at.is_not(None),
        )
    )

    inv_session = InterviewSession(
        resume_id=resume.id,
        user_id=clerk_subject,
        role=r,
        history_summary=None,
        questions_asked=0,
        current_difficulty=str(ten[0].get("difficulty") or "medium"),
        running_score_sum=0,
        hard_mode=hard_mode,
        pending_question=bank,
        turns=[],
        final_summary=None,
    )
    session.add(inv_session)
    await session.flush()

    pub = []
    for q in ten:
        item: dict[str, object] = {
            "question": q["question"],
            "difficulty": q["difficulty"],
            "bucket": q["bucket"],
            "source_note_section_id": q.get("source_note_section_id"),
        }
        if q.get("source_note_section_tag"):
            item["source_note_section_tag"] = q["source_note_section_tag"]
        pub.append(item)

    return {
        "session_id": str(inv_session.id),
        "questions": pub,
    }


async def score_quiz(
    session: AsyncSession,
    *,
    session_id: uuid.UUID,
    answers: list[str],
    clerk_subject: str | None,
) -> dict[str, object]:
    batch_n = get_settings().interview_batch_question_count
    if len(answers) != batch_n:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exactly {batch_n} answers required",
        )

    cleaned = [a.strip() for a in answers]
    if any(not a for a in cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="each answer must be non-empty",
        )

    row = await session.scalar(
        select(InterviewSession)
        .where(InterviewSession.id == session_id)
        .with_for_update()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    if row.user_id and clerk_subject and row.user_id != clerk_subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    if row.completed_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="session already complete")

    pq = row.pending_question
    if not isinstance(pq, dict) or pq.get("kind") != "static":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="session is not a pending batch quiz",
        )

    qs = pq.get("questions")
    if not isinstance(qs, list) or len(qs) != batch_n:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="corrupt quiz session")

    resume = await require_resume_readable(session, row.resume_id, clerk_subject)
    text = (resume.raw_text or "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Resume text is no longer available; upload again.",
        )

    pairs: list[tuple[str, str]] = []
    for i, qd in enumerate(qs):
        if not isinstance(qd, dict):
            continue
        qtext = str(qd.get("question") or "").strip() or f"Question {i + 1}"
        pairs.append((qtext, cleaned[i]))

    if len(pairs) != batch_n:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="corrupt quiz session")

    sys_p = build_batch_score_system_prompt(
        resume_text=text,
        role=str(row.role),
        question_count=batch_n,
    )
    usr_p = build_batch_score_user_prompt(qa_pairs=pairs)

    data, _ = await interview_llm.generate_interview_json(
        full_system_prompt=sys_p,
        user_prompt=usr_p,
    )

    raw_score = data.get("final_score")
    final_score = _clamp_score_final(raw_score)
    heat = _heat_label_from_final(final_score)
    one_liner = str(data.get("one_liner") or "").strip()
    per_answer = _normalize_per_answer(data.get("per_answer"), cleaned, expected=batch_n)

    summary: dict[str, Any] = {
        "final_score": final_score,
        "heat_label": heat,
        "per_answer": per_answer,
    }
    if one_liner:
        summary["one_liner"] = one_liner

    _append_interview_quiz_score(resume, final_score)

    # Resolve section refs before adding tags so autoflush on SELECT cannot insert tags
    # while a concurrent ``start_session`` has removed the interview_sessions row.
    weak_ids: set[uuid.UUID] = set()
    tag_rows: list[tuple[str, str | None, int, str | None]] = []
    for i in range(batch_n):
        qd = qs[i] if isinstance(qs[i], dict) else {}
        qtext = str(qd.get("question") or "").strip() or f"Question {i + 1}"
        sid_str = qd.get("source_note_section_id") if isinstance(qd, dict) else None
        tag_str = qd.get("source_note_section_tag") if isinstance(qd, dict) else None
        resolved_sid = await resolve_note_section_id(
            session,
            resume_id=row.resume_id,
            section_id_str=sid_str if isinstance(sid_str, str) else None,
            section_tag_str=tag_str if isinstance(tag_str, str) else None,
        )
        sid_final = str(resolved_sid) if resolved_sid is not None else None
        pa = per_answer[i]
        try:
            nscore = int(pa.get("numeric_score"))
        except (TypeError, ValueError):
            nscore = _numeric_from_signal(str(pa.get("signal") or "yellow"))
        sig = str(pa.get("signal") or "").lower()
        if resolved_sid is not None and (sig == "red" or nscore <= WEAK_SCORE_THRESHOLD):
            weak_ids.add(resolved_sid)
        tag_rows.append(
            (
                qtext,
                sid_final,
                nscore,
                (str(pa.get("analysis") or "").strip()[:6000] or None),
            )
        )

    for qtext, sid_final, nscore, missed in tag_rows:
        await _maybe_record_section_quiz_tag(
            session,
            resume_id=row.resume_id,
            interview_session_id=row.id,
            section_id_str=sid_final,
            question=qtext,
            score_1_to_10=nscore,
            what_they_missed=missed,
        )

    await session.flush()
    tag_weak = await weak_section_ids_from_session_quiz_tags(session, row.id)
    weak_ids |= tag_weak
    await set_prep_note_weak_flags_for_resume(
        session,
        resume_id=row.resume_id,
        weak_section_ids=weak_ids,
    )

    row.pending_question = None
    row.final_summary = summary
    row.completed_at = datetime.now(UTC)
    row.questions_asked = batch_n
    await session.flush()

    await session.delete(row)

    return {
        "final_score": final_score,
        "heat_label": heat,
        "one_liner": one_liner or None,
        "per_answer": per_answer,
        "interview_quiz_scores": normalize_interview_quiz_scores(resume.interview_quiz_scores),
    }


async def submit_answer(
    session: AsyncSession,
    *,
    session_id: uuid.UUID,
    answer: str,
    clerk_subject: str | None,
) -> dict[str, object]:
    ans = answer.strip()
    if not ans:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="answer is required")

    row = await session.get(InterviewSession, session_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    if row.user_id and clerk_subject and row.user_id != clerk_subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    if row.completed_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="session already complete")

    pending = row.pending_question
    if not isinstance(pending, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no pending question")

    if pending.get("kind") == "static":
        n_ans = get_settings().interview_batch_question_count
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This quiz is scored in one step — use POST /interview/score with all {n_ans} answers.",
        )

    resume = await require_resume_readable(session, row.resume_id, clerk_subject)
    text = (resume.raw_text or "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Resume text is no longer available; upload again.",
        )

    study = await load_study_notes_for_prompt(session, row.resume_id)

    pq = _pending_from_dict(pending, difficulty_default="medium")
    last_q = pq["question"]
    last_diff = pq["difficulty"]

    system = build_interview_system_prompt(
        resume_text=text,
        role=str(row.role),
        hard_mode=bool(row.hard_mode),
        study_notes=study,
    )
    turn_user = build_turn_user_prompt(
        session_summary=row.history_summary,
        questions_asked=row.questions_asked,
        last_question=last_q,
        last_difficulty=last_diff,
        candidate_answer=ans,
    )

    data, _ = await interview_llm.generate_interview_json(
        full_system_prompt=system,
        user_prompt=turn_user,
    )

    grade_raw = data.get("grade")
    if not isinstance(grade_raw, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Interview model returned an invalid grade",
        )

    score = _clamp_grade(grade_raw.get("score"))
    verdict = str(grade_raw.get("verdict") or "").strip() or "No verdict."
    missed = _as_str(grade_raw.get("what_they_missed"))

    resolved_answer = await resolve_note_section_id(
        session,
        resume_id=row.resume_id,
        section_id_str=pq.get("source_note_section_id"),
        section_tag_str=pq.get("source_note_section_tag"),
    )
    await _maybe_record_section_quiz_tag(
        session,
        resume_id=row.resume_id,
        interview_session_id=row.id,
        section_id_str=str(resolved_answer) if resolved_answer is not None else None,
        question=last_q,
        score_1_to_10=score,
        what_they_missed=missed,
    )

    updated_summary = str(data.get("updated_summary") or "").strip()

    row.history_summary = updated_summary or row.history_summary
    row.questions_asked += 1
    row.running_score_sum += score

    turns = list(row.turns or [])
    turns.append(
        {
            "n": row.questions_asked,
            "difficulty": last_diff,
            "score": score,
            "verdict": verdict,
        }
    )
    row.turns = turns

    done = row.questions_asked >= _ADAPTIVE_SESSION_TURNS

    next_q_out: dict[str, object] | None = None
    final_out: dict[str, object] | None = None

    if done:
        row.current_difficulty = _norm_diff(data.get("next_difficulty") or row.current_difficulty)
        row.pending_question = None
        row.completed_at = datetime.now(UTC)

        final_score = max(0, min(100, row.running_score_sum))
        heat = _heat_label_from_final(final_score)

        fs_raw = data.get("final_summary")
        base: dict[str, Any] = dict(fs_raw) if isinstance(fs_raw, dict) else {}

        base["final_score"] = final_score
        base["heat_label"] = heat
        row.final_summary = base
        final_out = base

        out: dict[str, object] = {
            "grade": {
                "score": score,
                "verdict": verdict,
                "what_they_missed": missed,
            },
            "next_question": None,
            "session_complete": True,
            "final_summary": final_out,
        }
        await session.flush()
        weak_ids = await weak_section_ids_from_session_quiz_tags(session, row.id)
        await set_prep_note_weak_flags_for_resume(
            session,
            resume_id=row.resume_id,
            weak_section_ids=weak_ids,
        )
        return out

    next_diff = _norm_diff(data.get("next_difficulty") or row.current_difficulty)
    row.current_difficulty = next_diff

    nq_raw = data.get("next_question")
    if isinstance(nq_raw, dict):
        nq = _pending_from_dict(nq_raw, difficulty_default=next_diff)
        await hydrate_question_section_refs(session, resume_id=row.resume_id, questions=[nq])
        row.pending_question = nq
        next_q_out = {
            "question": nq["question"],
            "difficulty": nq["difficulty"],
            "bucket": nq["bucket"],
            "source_note_section_id": nq.get("source_note_section_id"),
        }
        if nq.get("source_note_section_tag"):
            next_q_out["source_note_section_tag"] = nq["source_note_section_tag"]
    else:
        row.pending_question = None

    await session.flush()

    return {
        "grade": {
            "score": score,
            "verdict": verdict,
            "what_they_missed": missed,
        },
        "next_question": next_q_out,
        "session_complete": False,
        "final_summary": None,
    }


async def get_summary(
    session: AsyncSession,
    *,
    session_id: uuid.UUID,
    clerk_subject: str | None,
) -> dict[str, object]:
    row = await session.get(InterviewSession, session_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    if row.user_id and clerk_subject and row.user_id != clerk_subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")

    if row.completed_at is None or not row.final_summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not complete")

    return dict(row.final_summary)
