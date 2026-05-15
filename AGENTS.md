# AGENTS.md — Am I Cooked?

Persistent context for any AI agent (Cursor, Claude, Codex, etc.) working in this repo.

## Where to read first

1. [`plans/project-overview.md`](./plans/project-overview.md) — what we're building and why.
2. [`plans/current-goals.md`](./plans/current-goals.md) — what phase we're in and what's in scope **right now**.
3. [`plans/tasks.md`](./plans/tasks.md) — the 8-step v1 build order. Pick from here if there's no explicit user instruction.
4. [`plans/decisions.md`](./plans/decisions.md) — every product/tech decision and its reasoning. **Do not re-litigate decided things.**
5. [`plans/agent-instructions.md`](./plans/agent-instructions.md) — the full rules of engagement.

If a question isn't answered in `plans/`, surface it in chat — do not guess silently.

## The single most important rule

**v1 success = does someone screenshot their Cooked Score and share it?**
After the core API works, **build the score-card UI before anything else.** Do not default to building auth or dashboards first. See [D-010](./plans/decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).

## Stack at a glance

- **Repo**: monorepo with `frontend/` (Next.js 15, App Router) and `backend/` (FastAPI, Python 3.11+).
- **DB**: Postgres on Railway. **All schema changes through Alembic.**
- **LLM**: Google Generative Language API (default **Gemma 4 31B IT** + **Gemini 2.0 Flash** fallback via env) + Groq Llama 3.3 70B, **free tier only**, routed task-by-task. All calls go through `backend/app/services/llm/router.py`.
- **Async**: FastAPI `BackgroundTasks` + SSE. **No Redis, no Celery.**
- **Scheduling**: APScheduler (in-process). Used for the 24-hour raw-resume-text retention sweep.
- **Storage**: Cloudflare R2 for PDFs (24h, then deleted).
- **Auth**: Clerk — wired in **only after** the core loop works.
- **Analytics**: PostHog — wired in last.
- **Deploy**: Vercel (frontend, root dir `frontend`) + Render (backend, root dir `backend`).

See [`plans/architecture.md`](./plans/architecture.md) for the full picture.

## Always-load Cursor rules

These auto-apply via `.cursor/rules/*.mdc`:

| Rule | Scope |
| --- | --- |
| [`v1-guardrails.mdc`](./.cursor/rules/v1-guardrails.mdc) | Always |
| [`v1-skip-list.mdc`](./.cursor/rules/v1-skip-list.mdc) | Always |
| [`frontend.mdc`](./.cursor/rules/frontend.mdc) | `frontend/**/*.{ts,tsx,js,jsx,css}` |
| [`backend.mdc`](./.cursor/rules/backend.mdc) | `backend/**/*.py` |

## Top-of-mind hard rules

- **Free tier only** for LLM. No paid models in v1.
- **Score card lives at `/share/[slug]`** with a `@vercel/og`-generated OG image. Mobile-first at 375px.
- **3 analyses per user per day**, enforced at the DB layer **before** the LLM call.
- **4000-word input cap** enforced in `parser.py`.
- **`share_slug` only in public URLs.** Never expose internal UUIDs.
- **`prompt_version` on every `analyses` row.**
- **Raw resume text deleted after 24 h** via APScheduler. Analysis output kept forever.
- **Every async surface** has loading + error + empty + rate-limited + degraded states. Happy-path-only is a bug.
- **Stream progress via SSE.** A blank spinner for >2s is a bug.

## Working procedure

1. Match the action to a `tasks.md` step before coding.
2. If it touches the DB → write an Alembic migration (no manual `ALTER`).
3. If it touches an LLM → it goes in `backend/app/services/llm/`.
4. If it touches a public URL → `share_slug`, never UUID.
5. Lint both sides before declaring done (`npm run lint`, `ruff check .`).
6. Update `plans/changelog.md` with a one-liner. Add an ADR in `plans/decisions.md` if you set a precedent.
