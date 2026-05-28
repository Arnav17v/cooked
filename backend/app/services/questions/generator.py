"""Personalized interview question generation via Gemini/Groq."""

from __future__ import annotations

import logging

from pydantic import ValidationError

from app.schemas.llm_outputs import QuestionLLMItem, QuestionsLLMOutput
from app.services.llm.router import LLMResult, LLMRouter

log = logging.getLogger(__name__)

_QUESTIONS_SYSTEM = """You generate interview questions for someone prepping from THEIR resume.

Produce between 8 and 10 questions total.

STEP 1 — ROLE COMPETENCY PILLARS:
Before writing any questions, silently identify the 3 core competency pillars every interviewer
for the target role will test, regardless of what is on the resume. Derive them from your own
training knowledge for that role.

STEP 2 — RESUME vs PILLAR:
For each pillar, check: does the resume address it explicitly?
  - If yes → ask a from_resume or gap question on it.
  - If no  → generate at least one industry_standard question for it.

Split into three buckets (field `bucket` on each question):
- "bullet": questions ONLY answerable because of a specific thing they wrote. MUST set `source_bullet` to a verbatim quote from the resume that the question probes.
- "gap": questions an interviewer asks because something is missing, vague, or risky — weak employment history, no metrics, fuzzy ownership, etc. Use empty string for source_bullet.
- "industry_standard": tests a core expected competency for this role that the resume does NOT address.
  Derive from the role's standard interview pillars. source_bullet is always null or empty.
  Name the competency area in the question text (e.g. "On system design: ...", "On algorithms: ...").

Rules:
- At least 3 questions must be bucket "bullet" with real verbatim source_bullet quotes when the resume has enough lines.
- At least 2 questions must be bucket "gap".
- At least 1 question must be bucket "industry_standard".
- If a "bullet" question would still make sense without reading that bullet, rewrite it — too generic.
- category must be one of: behavioral, technical, project
- difficulty must be one of: Easy, Medium, Hard

Return ONLY valid JSON: {"questions": [{"question","category","source_bullet","difficulty","bucket"}, ...]}"""


async def generate_questions_with_llm(
    resume_text: str, target_role: str
) -> tuple[QuestionsLLMOutput, LLMResult]:
    router = LLMRouter()
    user_prompt = (
        f"Target role: {target_role}\n\nResume text:\n{resume_text}\n\nRespond with JSON only."
    )
    result = await router.call(
        task="questions",
        system_prompt=_QUESTIONS_SYSTEM,
        user_prompt=user_prompt,
        response_schema=QuestionsLLMOutput,
    )

    if not isinstance(result.content, dict):
        return QuestionsLLMOutput(questions=[]), result

    if result.content.get("error") == "both_providers_unavailable":
        return QuestionsLLMOutput(questions=[]), result

    try:
        out = QuestionsLLMOutput.model_validate(result.content)
    except ValidationError as e:
        log.warning("questions JSON failed validation: %s", e)
        return QuestionsLLMOutput(questions=[]), result

    clipped = out.questions[:10]
    # Ensure minimum viable list length isn't enforced — UI handles empty
    return QuestionsLLMOutput(questions=_normalize_questions(clipped)), result


def _normalize_questions(items: list[QuestionLLMItem]) -> list[QuestionLLMItem]:
    fixed: list[QuestionLLMItem] = []
    for q in items:
        cat = q.category.strip().lower()
        if cat not in ("behavioral", "technical", "project"):
            cat = "project"
        diff = q.difficulty.strip()
        if diff not in ("Easy", "Medium", "Hard"):
            diff = "Medium"
        bucket = q.bucket.strip().lower()
        if bucket not in ("bullet", "gap", "industry_standard"):
            bucket = "bullet"
        fixed.append(
            QuestionLLMItem(
                question=q.question.strip(),
                category=cat,
                source_bullet=q.source_bullet.strip(),
                difficulty=diff,
                bucket=bucket,
            )
        )
    return fixed
