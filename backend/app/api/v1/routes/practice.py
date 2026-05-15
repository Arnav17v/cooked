"""Answer practice (stretch v1, required v2).

Routes:
- POST /api/v1/practice/answer - plain prose feedback, no rubric

Wired only if Steps 0-8 finish with time to spare (D-010).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/practice", tags=["practice"])


@router.post("/answer")
async def submit_answer() -> dict[str, str]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Stretch v1 - wired only after Steps 0-8 complete",
    )
