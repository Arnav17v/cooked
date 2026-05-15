#!/usr/bin/env python3
r"""Delete all application rows from Postgres. Keeps `alembic_version` and schema.

Uses `DATABASE_URL` from `backend/.env` (same as the API).

**Local**
  cd backend && WIPE_DB_CONFIRM=yes .venv/bin/python scripts/wipe_app_data.py

**Railway / remote** (same URL you use for `pg_dump` — be sure you mean it):
  cd backend && WIPE_DB_CONFIRM=yes DATABASE_URL='postgresql://...' .venv/bin/python scripts/wipe_app_data.py

Or with async URL from app settings, export a sync URL for this script only:
  WIPE_DB_CONFIRM=yes DATABASE_URL='postgresql+asyncpg://...' .venv/bin/python scripts/wipe_app_data.py
  (script normalizes +asyncpg+ to empty for sync driver)

Refuses to run unless `WIPE_DB_CONFIRM=yes` (exact value, case-insensitive).
"""

from __future__ import annotations

import asyncio
import os
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

# Truncate from `users` — CASCADE removes dependent rows (resumes, analyses, questions,
# practice_sessions, notes, interview_sessions, tags, etc.).
_TRUNCATE_SQL = """
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
"""


def _async_database_url() -> str:
    raw = (os.environ.get("DATABASE_URL") or "").strip()
    if not raw:
        from app.core.config import get_settings

        raw = get_settings().database_url.strip()
    if not raw:
        print("DATABASE_URL is not set.", file=sys.stderr)
        sys.exit(1)
    # App uses postgresql+asyncpg:// — ensure async driver for create_async_engine
    if raw.startswith("postgresql://") and "+asyncpg" not in raw:
        return raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw


async def _run(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text(_TRUNCATE_SQL))


async def _async_main(url: str) -> None:
    engine = create_async_engine(url, echo=False)
    try:
        await _run(engine)
    finally:
        await engine.dispose()


def main() -> int:
    if os.environ.get("WIPE_DB_CONFIRM", "").strip().lower() != "yes":
        print(
            "Refusing: set WIPE_DB_CONFIRM=yes to truncate all app data (users, resumes, analyses, …).",
            file=sys.stderr,
        )
        return 2
    url = _async_database_url()
    asyncio.run(_async_main(url))

    print("Wiped: all rows under `users` (CASCADE). `alembic_version` unchanged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
