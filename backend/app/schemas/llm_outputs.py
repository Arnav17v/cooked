"""Pydantic shapes for LLM JSON validation — single-call roast bundle."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class FlagItem(BaseModel):
    source_bullet: str = Field(..., description="Verbatim line from the resume")
    issue: str
    suggested_rewrite: str


class QuestionItem(BaseModel):
    question: str
    bucket: str = Field(..., description='"from_resume" | "gap"')
    source_bullet: str | None = None

    @field_validator("bucket")
    @classmethod
    def bucket_ok(cls, v: str) -> str:
        low = v.strip().lower()
        if low == "gap":
            return "gap"
        if low in ("from_resume", "bullet"):
            return "from_resume"
        return "from_resume"


class SectionVerdictsObj(BaseModel):
    experience: str | None = None
    projects: str | None = None
    skills: str | None = None
    education: str | None = None


class RoastLLMOutput(BaseModel):
    """Unified JSON from one Gemini/Groq call (score + flags + questions)."""

    score: int = Field(..., ge=0, le=100)
    heat_label: str = ""
    one_liner: str = Field(..., description="One brutal sentence — no bullet points")
    section_verdicts: SectionVerdictsObj | dict[str, Any] = Field(default_factory=dict)
    flags: list[FlagItem] = Field(default_factory=list)
    questions: list[QuestionItem] = Field(default_factory=list)

    @field_validator("heat_label", mode="before")
    @classmethod
    def strip_heat(cls, v: object) -> str:
        if v is None:
            return ""
        return str(v).strip()


# Legacy aliases for older pipelines
class RedFlagItem(BaseModel):
    source_bullet: str = ""
    issue: str
    suggested_rewrite: str


class SectionVerdict(BaseModel):
    section: str
    verdict: str


class AnalyzeLLMOutput(BaseModel):
    cooked_score: int = Field(..., ge=0, le=100)
    heat_label: str
    headline: str
    score_breakdown: dict[str, Any] = Field(default_factory=dict)
    red_flags: list[RedFlagItem] = Field(default_factory=list)
    rewritten_bullets: list[str] = Field(default_factory=list)
    section_verdicts: list[SectionVerdict] = Field(default_factory=list)


class QuestionLLMItem(BaseModel):
    question: str
    category: str = "general"
    source_bullet: str = ""
    difficulty: str = "Medium"
    bucket: str = "bullet"


class QuestionsLLMOutput(BaseModel):
    questions: list[QuestionLLMItem] = Field(default_factory=list)
