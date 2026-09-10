# Get Uncooked

Interview preparation built from a resume. This monorepo combines a Next.js interface with a FastAPI backend for resume analysis, AI Insights, in-depth reviews, personalized interview questions, practice, notes, and prep plans.

[Project website](https://getuncooked.pro) · [Backend](backend/) · [Engineering decisions](plans/decisions.md)

## Engineering highlights

- Python API with async SQLAlchemy, PostgreSQL persistence, and versioned Alembic migrations.
- Resume text/PDF intake and a background analysis pipeline with Server-Sent Events for progress.
- A shared LLM router that chooses providers by task and falls back across Google and Groq on recoverable failures.
- S3-compatible PDF storage, Clerk authentication integration, and scheduled maintenance/reminder tasks.
- Next.js 15, React, TypeScript, and Tailwind CSS for the frontend.

## Architecture

The frontend calls FastAPI through `frontend/src/lib/api.ts`. Routes under `backend/app/api/v1/` delegate to services for parsing, analysis, questions, and prep plans. SQLAlchemy models store application state; Alembic tracks schema changes. PDF blobs use S3-compatible storage through `core/storage.py`.

Analysis runs through `services/resume/pipeline.py`; the browser receives progress through an SSE endpoint. Provider SDKs live under `services/llm/`, with routing and degraded-result handling in `router.py`.

## Run locally

Prerequisites: Node.js 20+, Python 3.11+, and PostgreSQL. Configure your own database and service credentials; the full AI/auth/PDF flows require the corresponding providers.

```bash
git clone https://github.com/Arnav17v/cooked.git
cd cooked/backend
python -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
# Edit .env before continuing: DATABASE_URL, AI keys, Clerk and storage settings.
alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

In a second terminal, from the repository root:

```bash
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
# and your Clerk configuration (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY).
npm run dev
```

Open `http://localhost:3000`. Backend health: `http://localhost:8000/api/v1/health`.
On Windows, activate the virtual environment with `.venv\Scripts\activate`.

See `backend/.env.example` and `backend/app/core/config.py` for current settings. Apply existing migrations with `alembic upgrade head`; a fresh checkout does not need a new initial migration.

## Status and scope

This is an evolving application. Provider availability and configured credentials affect the live workflows; no accuracy, latency, usage, or hiring-outcome claims are made here. Some planning documents describe earlier phases; the source code and current settings are the implementation reference.

Contributors: start with [AGENTS.md](AGENTS.md) and [plans/](plans/README.md). The existing project licensing position remains unchanged: no open-source license is granted by this README.
