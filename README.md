# Am I Cooked?

AI resume roast and interview-prep app. Upload a resume, pick a target role, get a brutally honest **Cooked Score**, red flags with rewrites, and 10–15 interview questions pulled from your actual bullets.

Monorepo. v1 runs on a completely free stack: Gemini 2.0 Flash + Groq Llama 3.3 70B, FastAPI on Render, Postgres on Railway, R2 for PDFs, Clerk for auth, PostHog for analytics.

> **New agents / contributors start here**: read [`AGENTS.md`](./AGENTS.md), then [`plans/`](./plans/README.md). The full knowledge base is in `plans/`. Cursor auto-loads [`.cursor/rules/*.mdc`](./.cursor/rules/).

## Layout

```
cooked/
├── AGENTS.md                # entry point for AI agents
├── .cursor/rules/           # always-loaded rules
├── plans/                   # persistent knowledge base (long form)
├── frontend/                # Next.js 15 (App Router) — Vercel
└── backend/                 # FastAPI + SQLAlchemy + Alembic — Render
```

## Quick start

You need:

- Node.js 20+ for the frontend.
- Python 3.11+ for the backend.
- A local Postgres or a Railway connection string.

```bash
# Frontend
cd frontend
npm install
npm run dev                  # http://localhost:3000

# Backend (in a second terminal)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env         # fill in keys
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Full setup details, env vars, and troubleshooting: [`plans/setup.md`](./plans/setup.md).

## Phase

v1, free-stack, three must-have features only:

1. Resume upload + screenshot-able **Cooked Score** card
2. Red-flag detection with suggested rewrites
3. 10–15 personalized interview questions

See [`plans/current-goals.md`](./plans/current-goals.md) and the 8-step [`plans/tasks.md`](./plans/tasks.md).

## The one metric

**Does someone screenshot the Cooked Score and share it?**

If yes, v1 worked. Everything else is secondary. See [D-010](./plans/decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).

## License

Private project. Not open source.
