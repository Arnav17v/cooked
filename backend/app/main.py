"""FastAPI entrypoint.

Wires:
- CORS for the frontend origin (`ALLOWED_ORIGINS`).
- The `/api/v1` router (health + resume + analysis + questions + practice + share).
- APScheduler lifecycle (optional raw-text retention sweep, D-015 / D-017) via the lifespan handler.

Run locally:
    python -m uvicorn app.main:app --reload --port 8000

Render uses:
    uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core import scheduler
from app.core.config import get_settings
from app.services.resume.retention import sweep_old_resume_text

logging.basicConfig(level=get_settings().log_level)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if (settings.clerk_secret_key or "").strip() and not (settings.clerk_jwt_issuer or "").strip():
        log.warning(
            "CLERK_SECRET_KEY is set but CLERK_JWT_ISSUER is empty — "
            "Bearer JWTs cannot be verified; GET /api/v1/me/roasts will return 401. "
            "Set CLERK_JWT_ISSUER to your Clerk Frontend API / JWT issuer (no trailing slash)."
        )
    scheduler.register_jobs(retention_job=sweep_old_resume_text)
    scheduler.start()
    log.info("startup complete — env=%s", settings.env)
    try:
        yield
    finally:
        scheduler.shutdown()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Am I Cooked? — backend",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    return app


app = create_app()
