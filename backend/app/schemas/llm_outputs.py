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


class QuizBatchPerAnswerItem(BaseModel):
    n: int = Field(..., ge=1)
    signal: str
    numeric_score: int = Field(..., ge=1, le=10)
    highlight_quote: str = ""
    analysis: str = ""

    @field_validator("signal")
    @classmethod
    def signal_ok(cls, v: str) -> str:
        s = v.strip().lower()
        if s in ("green", "yellow", "red"):
            return s
        if s in ("g", "strong", "good"):
            return "green"
        if s in ("r", "bad", "weak"):
            return "red"
        return "yellow"


class QuizBatchScoreLLMOutput(BaseModel):
    """Batch quiz scoring JSON from ``POST /interview/score``."""

    final_score: int = Field(..., ge=0, le=100)
    one_liner: str = ""
    per_answer: list[QuizBatchPerAnswerItem] = Field(default_factory=list)


class NotesSectionLLMItem(BaseModel):
    title: str
    content: str
    display_order: int
    tier: str = "domain"

    @field_validator("tier")
    @classmethod
    def tier_ok(cls, v: str) -> str:
        t = v.strip().lower()
        if t in ("project", "domain", "weak_area", "research"):
            return t
        return "domain"


class NotesGenerateLLMOutput(BaseModel):
    sections: list[NotesSectionLLMItem] = Field(default_factory=list)


class NotesUpdatedSectionLLMItem(BaseModel):
    section_id: str
    content: str


class NotesUpdateLLMOutput(BaseModel):
    updated_sections: list[NotesUpdatedSectionLLMItem] = Field(default_factory=list)


class PrepPlanDayLLMItem(BaseModel):
    day_number: int = Field(..., ge=1, le=30)
    focus_area: str
    morning_task: str
    evening_task: str
    quiz_topics: list[str] = Field(default_factory=list)
    intensity: str = "medium"

    @field_validator("intensity")
    @classmethod
    def intensity_ok(cls, v: str) -> str:
        low = v.strip().lower()
        if low in ("light", "medium", "heavy"):
            return low
        return "medium"


class PrepPlanLLMOutput(BaseModel):
    plan_title: str
    summary: str
    days: list[PrepPlanDayLLMItem] = Field(default_factory=list)


class PrepPlanModuleLLMItem(BaseModel):
    kind: str
    title: str
    content: str | None = None
    link_url: str | None = None
    quiz_topics: list[str] = Field(default_factory=list)

    @field_validator("kind")
    @classmethod
    def kind_ok(cls, v: str) -> str:
        low = v.strip().lower()
        if low in ("notes", "task", "quiz"):
            return low
        return "notes"


class PrepPlanDayModulesLLMItem(BaseModel):
    day_number: int = Field(..., ge=1, le=30)
    modules: list[PrepPlanModuleLLMItem] = Field(default_factory=list)


class PrepPlanInitiateLLMOutput(BaseModel):
    days: list[PrepPlanDayModulesLLMItem] = Field(default_factory=list)
