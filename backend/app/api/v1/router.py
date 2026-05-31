"""Aggregator for every `/api/v1` route.

Adding a new route group:
1. Create `app/api/v1/routes/<name>.py` exposing `router`.
2. Import + `include_router` here.
3. Document in `plans/infra.md → API contract`.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import (
    analysis,
    health,
    interview,
    me,
    notes,
    practice,
    questions,
    resume,
    roast,
    seminar,
    share,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(me.router)
api_router.include_router(resume.router)
api_router.include_router(roast.router)
api_router.include_router(notes.router)
api_router.include_router(analysis.router)
api_router.include_router(questions.router)
api_router.include_router(practice.router)
api_router.include_router(interview.router)
api_router.include_router(seminar.router)
api_router.include_router(share.router)
