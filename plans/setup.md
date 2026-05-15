# Setup

Two-service app (frontend + backend) from v1 onward. Locked by [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog). See [infra.md](./infra.md) for the full services map.

## Prerequisites

- **Node.js** LTS (v20+, matches `@types/node ^20`).
- **Python** 3.11+ (for the FastAPI backend).
- **A package manager for Node** — `npm` is the default; `pnpm-lock.yaml` exists from earlier scaffolding. Pick one and stick with it.
- **A Python package manager** — `uv` is the recommended default (fast). `pip` works.

You will also need free-tier accounts for all the services in the build order (Step 0 in [`tasks.md`](./tasks.md#step-0--pre-work-do-once-before-step-1)).

## Frontend (Next.js)

> The frontend lives in `frontend/` post-Step-0 of the build order. Until that move happens, all `npm` commands run from the repo root and the path is `src/...`. After the move, run them from `frontend/` and the path is `frontend/src/...`.

```bash
# after Step 0
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:3000`. If 3000/3001 are in use, Next will hop to `3002`, `3003`, … (this has happened during development — see `terminals/1.txt`).

### Frontend scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start Next.js dev server. |
| `npm run build` | Production build. **Note: configured with `--no-lint`** in `package.json`. |
| `npm run start` | Run the built production server. |
| `npm run lint` | Run ESLint against the project. |

## Backend (FastAPI) — to be scaffolded at Step 0

> Does not exist yet. This section is the target state once `backend/` is created in [tasks.md Step 0](./tasks.md#step-0--pre-work-do-once-before-step-1).

```bash
# from repo root
cd backend
uv venv && source .venv/bin/activate     # or: python -m venv .venv && source .venv/bin/activate
uv pip install -r requirements.txt       # or: pip install -e .
alembic upgrade head                     # apply migrations to the local DB
uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/api/v1/health`.

### Backend scripts (informal)

| Command | What it does |
| --- | --- |
| `uvicorn app.main:app --reload` | Dev server with autoreload. |
| `alembic revision --autogenerate -m "msg"` | Create a new migration. See [database-schema.md](./database-schema.md). |
| `alembic upgrade head` | Apply pending migrations. |
| `alembic downgrade -1` | Roll back the last migration locally. |
| `ruff check .` | Lint. |

## Environment variables

Two `.env` files, neither committed. Mirror keys (no values) in `.env.example`.

### Frontend — `frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000   # FastAPI base
# Added at build-order step 6 (Clerk):
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
# Added at build-order step 8 (PostHog):
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

### Backend — `backend/.env`

```
DATABASE_URL=postgresql+asyncpg://...      # Railway connection string
GEMINI_API_KEY=
GROQ_API_KEY=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
ALLOWED_ORIGINS=http://localhost:3000
# Added at build-order step 6:
CLERK_SECRET_KEY=
# Added at build-order step 8:
POSTHOG_API_KEY=
```

Full env-var reference also lives in [infra.md → Environment variables](./infra.md#environment-variables).

## Running both services together

The frontend talks to the backend via `NEXT_PUBLIC_API_URL`. For local dev, open two terminals:

```bash
# terminal 1
cd backend && uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend && npm run dev
```

Then visit `http://localhost:3000`.

## Database

- Local dev: any Postgres works. Railway also gives a connection string you can use directly while developing if you don't want a local DB.
- All schema changes go through Alembic — per [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer). No manual `ALTER TABLE`. Ever.
- See [database-schema.md](./database-schema.md) for the table definitions and evolution rules.

## File layout to know

See [`architecture.md → Repo layout`](./architecture.md#repo-layout-target-v1).

Key files when working on visuals (paths shown as post-Step-0):

- `frontend/src/app/page.tsx` — every section of the landing page.
- `frontend/src/components/resume-roast-demo.tsx` — the interactive demo (currently regex; backend-wired at Step 2).
- `frontend/src/components/score/ScoreCard.tsx` — the screenshot artifact (Step 3).
- `frontend/src/app/globals.css` — base styles, CSS variables, scrollbar, selection.
- `frontend/tailwind.config.ts` — `lc.*` color tokens, font families.
- `frontend/src/app/layout.tsx` — font wiring (Inter + JetBrains Mono via `next/font/google`).

Key files when working on backend:

- `backend/app/services/llm/router.py` — the **only** place an LLM SDK is allowed to be imported. Per [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
- `backend/app/services/resume/parser.py` — pymupdf + 4000-word cap.
- `backend/app/services/resume/retention.py` — daily 24h sweep ([D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup)).
- `backend/app/core/scheduler.py` — APScheduler wiring.
- `backend/app/db/migrations/` — Alembic.

## Troubleshooting

- **Port already in use** → Next will auto-increment; check the dev server output for the actual URL. For uvicorn, change `--port`.
- **Fonts look wrong** → confirm `--font-inter` and `--font-jetbrains` CSS vars are present on `<html>` (set in `layout.tsx`).
- **Tailwind classes not applying** → confirm `tailwind.config.ts` `content` globs cover `src/**` (they currently do).
- **Frontend can't reach backend** → check `NEXT_PUBLIC_API_URL` and that uvicorn is running. Also check `ALLOWED_ORIGINS` on the backend.
- **Render cold-start** on first request after sleep is expected (free tier). Frontend should show "warming the model" rather than spinning silently.
- **Migration drift** → never edit the DB manually. Generate a fresh Alembic revision instead.

## Deploy

- **Frontend** → Vercel. Project **Root Directory: `frontend`**. Production env vars set in the Vercel dashboard.
- **Backend** → Render Web Service. Project **Root Directory: `backend`**. Build command pulls deps; start command is `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. APScheduler runs in-process and starts automatically.
- **DB** → Railway, with `DATABASE_URL` injected into Render's env.
- **R2** → Cloudflare dashboard, keys into Render's env.
- **Cron-pinger** — not in v1 ([D-014](./decisions.md#d-014-skip-the-render-cron-pinger-in-v1)). Wire one when users complain about cold starts.
- **CI** — none in v1.
