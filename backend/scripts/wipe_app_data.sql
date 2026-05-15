-- Wipe all application data (keeps schema + alembic_version).
-- Run from repo:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/wipe_app_data.sql
-- Use a *sync* libpq URL (postgresql://... not postgresql+asyncpg://).

BEGIN;

TRUNCATE TABLE users RESTART IDENTITY CASCADE;

COMMIT;
