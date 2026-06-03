"""Pydantic shapes for on-demand in-depth analysis JSON."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

HireSignal = Literal["strong", "moderate", "weak", "pass"]
DangerLevel = Literal["high", "medium", "low"]


class MarketPositioning(BaseModel):
    percentile: int = Field(..., ge=1, le=100)
    percentile_label: str
    positioning_summary: str
    ceiling: str


class HiringManagerRead(BaseModel):
    first_impression: str
    inner_monologue: str
    hire_signal: HireSignal
    hire_reasoning: str

    @field_validator("hire_signal", mode="before")
    @classmethod
    def hire_ok(cls, v: object) -> str:
        s = str(v or "").strip().lower()
        if s in ("strong", "moderate", "weak", "pass"):
            return s
        return "moderate"


class InterviewForecastItem(BaseModel):
    topic: str
    reason: str
    likely_question: str
    danger_level: DangerLevel

    @field_validator("danger_level", mode="before")
    @classmethod
    def danger_ok(cls, v: object) -> str:
        s = str(v or "").strip().lower()
        if s in ("high", "medium", "low"):
            return s
        return "medium"


class CompetitiveGap(BaseModel):
    vs_top_10_percent: str
    quickest_gap_to_close: str
    hardest_gap_to_close: str


class HighestLeverageRewrite(BaseModel):
    original: str
    rewritten: str
    why_this_one: str


class ThirtyDayPlan(BaseModel):
    week_1: str
    week_2: str
    week_3: str
    week_4: str
    north_star: str


class InDepthAnalysisOutput(BaseModel):
    market_positioning: MarketPositioning
    hiring_manager_read: HiringManagerRead
    interview_forecast: list[InterviewForecastItem] = Field(..., min_length=3, max_length=3)
    competitive_gap: CompetitiveGap
    highest_leverage_rewrite: HighestLeverageRewrite
    thirty_day_plan: ThirtyDayPlan
