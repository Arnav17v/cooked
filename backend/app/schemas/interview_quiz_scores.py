"""Normalize `resumes.interview_quiz_scores` JSONB for API responses."""

from __future__ import annotations

from typing import Any

# Cap list length on `resumes.interview_quiz_scores` (append-only quiz history).
MAX_QUIZ_SCORE_HISTORY = 100


def normalize_interview_quiz_scores(raw: object | None) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            fs = int(item.get("final_score"))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            continue
        at = str(item.get("at") or "").strip()
        if not at:
            continue
        out.append({"final_score": max(0, min(100, fs)), "at": at})
    return sorted(out, key=lambda x: x["at"])
