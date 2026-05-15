"""Personalized interview question generation via Gemini/Groq."""

from __future__ import annotations

import logging

from pydantic import ValidationError

from app.schemas.llm_outputs import QuestionLLMItem, QuestionsLLMOutput
from app.services.llm.router import LLMResult, LLMRouter

log = logging.getLogger(__name__)

_QUESTIONS_SYSTEM = """You generate interview questions for someone prepping from THEIR resume.

Produce between 8 and 10 questions total.

Split into two buckets (field `bucket` on each question):
- "bullet": questions ONLY answerable because of a specific thing they wrote. MUST set `source_bullet` to a verbatim quote from the resume that the question probes.
- "gap": questions an interviewer asks because something is missing, vague, or risky — weak employment history, no metrics, fuzzy ownership, etc. Use empty string for source_bullet or a short phrase like "Overall narrative" if needed.

Rules:
- At least 4 questions must be bucket "bullet" with real verbatim source_bullet quotes when the resume has enough lines.
- At least 3 questions must be bucket "gap".
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
        if bucket not in ("bullet", "gap"):
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
