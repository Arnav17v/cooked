# Architecture

> Two-service architecture from v1 onward, locked by [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog). For the deployment/services view (costs, env vars, cold-start handling), see [infra.md](./infra.md). For the database tables, see [database-schema.md](./database-schema.md).

## Tech stack — frontend

| Layer | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) | `15.1.2` | React Server Components + client components. |
| Runtime | React | `^19.0.0` | |
| Language | TypeScript | `^5` | Strict-ish, follows `tsconfig.json`. |
| Styling | Tailwind CSS | `^3.4.1` | Plus `tailwindcss-animate`. |
| UI primitives | shadcn/ui (Radix) | — | Only `button.tsx` and `card.tsx` scaffolded so far in `src/components/ui/`. |
| Icons | `lucide-react` | `^0.469.0` | |
| Utils | `clsx`, `tailwind-merge`, `class-variance-authority` | | Standard shadcn helpers. |
| Fonts | `next/font/google` — Inter (UI), JetBrains Mono (code/labels) | | Wired via CSS variables `--font-inter`, `--font-jetbrains`. |
| OG images | `next/og` | — | At `app/share/[slug]/opengraph-image.tsx` once the share page is built. |
| Auth (added at build-order step 6) | Clerk | — | `@clerk/nextjs` on the frontend. |
| Analytics (last step) | PostHog | — | `posthog-js`. |

## Tech stack — backend

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | FastAPI | Async. Hosted on Render (free 750 hrs/mo). |
| Language | Python 3.11+ | |
| Async work | FastAPI `BackgroundTasks` + SSE | **No Redis, no Celery in v1.** Banned by [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog). |
| Scheduled jobs | `APScheduler` (in-process) | Optional raw-text retention sweep when enabled — [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup) / [D-017](./decisions.md#d-017-raw-resume-text-retention-is-opt-in-default-keep). |
| ORM | SQLAlchemy (async) | |
| Migrations | Alembic | Every schema change goes through a migration. See [database-schema.md](./database-schema.md) + [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer). |
| DB | PostgreSQL on Railway | Chosen because it does **not** pause on inactivity (unlike Supabase). |
| Blob storage | Cloudflare R2 | PDFs only. Frontend never uploads to R2 directly; FastAPI is the proxy. |
| PDF parsing | `pymupdf` | Server-side. 4000-word cap enforced in `services/resume/parser.py`. |
| LLM SDKs | Google AI (Gemini) + Groq | **Only allowed in `app/services/llm/`.** See [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover). |
| Rate limiting | `slowapi` + DB-enforced daily cap | 3 analyses/user/day. |
| Auth | Clerk JWT verification | Added at step 6 in the build order. |

## Current state (still Phase 0)

- Frontend exists; backend does not exist yet.
- `ResumeRoastDemo` still runs **local regex heuristics** — no real LLM, no DB, no backend.
- v1 build order (8 steps) is defined in [tasks.md](./tasks.md#p0--unblock-phase-1-v1-mvp).

## Repo layout (target, v1)

Monorepo per [D-013](./decisions.md#d-013-monorepo-with-frontend--backend-subfolders). Two subfolders, no workspace tooling.

> **Migration note**: the Next.js code currently lives at the repo root. The **first action of Step 0** ([tasks.md](./tasks.md#step-0--pre-work-do-once-before-step-1)) is moving it into `frontend/`. The tree below shows the target state.

```
cooked/
├── plans/
├── frontend/                        # Next.js
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── components.json
│   ├── postcss.config.mjs
│   ├── eslint.config.mjs
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── (auth)/              # Clerk-gated; added at step 6
│       │   ├── (dashboard)/         # added after core loop
│       │   └── share/[slug]/        # public score-card + opengraph-image
│       ├── components/
│       │   ├── resume-roast-demo.tsx
│       │   ├── score/               # ScoreCard component — D-010
│       │   ├── resume/
│       │   ├── questions/
│       │   ├── practice/
│       │   └── ui/
│       └── lib/
│           ├── utils.ts
│           ├── api.ts               # FastAPI client (step 1)
│           └── auth.ts              # Clerk helpers (step 6)
└── backend/                         # FastAPI (created at step 0)
    ├── pyproject.toml
    ├── alembic.ini
    └── app/
        ├── main.py
        ├── api/v1/routes/           # auth, resume, analysis, questions, practice
        ├── core/                    # config, security, storage, scheduler
        ├── services/
        │   ├── llm/                 # gemini.py, groq.py, router.py
        │   ├── resume/              # parser.py (pymupdf), analyzer.py, scorer.py, retention.py
        │   └── questions/           # generator.py, evaluator.py
        ├── models/                  # SQLAlchemy
        └── db/
            ├── session.py           # async session
            └── migrations/          # alembic
```

## Component boundaries (frontend, today)

- `src/app/page.tsx` — **Server Component**. Renders the full landing page: nav, hero, demo section wrapper, signals grid, roadmap problem-list table, ranked queues mock, seminars, credits, forum, sample questions, pricing, privacy footer. Contains a local `PlanCard` helper and a `DifficultyPill` helper.
- `src/components/resume-roast-demo.tsx` — **Client Component (`"use client"`)**. Holds the interactive form state and a `useMemo` regex analyzer. **No network calls today**, will call FastAPI once step 2 of the build order ships.
- `src/app/layout.tsx` — Loads Inter + JetBrains Mono and attaches the CSS variables to `<html>`.

## State management

- None beyond local `useState` in `ResumeRoastDemo`. No Zustand / Redux / Context yet.

## Data flow

### Today (Phase 0 — fake demo)

```
User edits textarea / select
        ↓ (controlled inputs)
useState in ResumeRoastDemo
        ↓
useMemo regex analyzer (pure, synchronous)
        ↓
Rendered output panel (cooked score, red flags, questions)
```

No persistence. Refresh wipes state. Intentional for the marketing/demo phase.

### v1 target

```
Browser
  → POST /api/v1/resume/upload (multipart PDF or pasted text)
      → FastAPI services/resume/parser.py (pymupdf, 4000-word cap)
      → R2 (store PDF if upload)
      → Postgres `resumes` row
  → POST /api/v1/resume/{id}/analyze
      → DB check: users.analyses_today < 3 (rate limit)
      → enqueue FastAPI BackgroundTask
      → SSE stream status: pending → processing → done
  → background task:
      → services/llm/router.py (task='analyze')
          → Gemini 2.0 Flash (with prompt caching)
          → on failure: Groq Llama 3.3 70B
          → on both failures: return degraded result
      → services/llm/router.py (task='questions')
          → same routing
      → write `analyses` row + `questions` rows, generate share_slug, status=done
  → Browser
      → GET /share/{slug} renders ScoreCard (also used by OG image)
```

## Planned architecture (v1 work in progress)

> See [infra.md](./infra.md) for deployment/services. See [database-schema.md](./database-schema.md) for tables.

- **Frontend never imports an LLM SDK.** All model calls happen in `backend/app/services/llm/`. The frontend talks to FastAPI through `src/lib/api.ts`.
- **`src/components/score/ScoreCard.tsx`** — single source of truth for the score-card visual. Reused by:
  - The interactive demo result panel,
  - `app/share/[slug]/page.tsx` (public share page, no UI chrome),
  - `app/share/[slug]/opengraph-image.tsx` (`next/og` social-preview).
- **Share URLs use `share_slug`, never internal UUIDs.** Locked by [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
- **LLM router** — `backend/app/services/llm/router.py`. Task-based routing per [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover). Cross-vendor failover. Prompt caching mandatory.
- **Rate limiting** — two layers:
  - DB-enforced daily cap (3 analyses/user/day) on the `users` row, **before** any LLM call fires.
  - `slowapi` IP-based rate limiting on every endpoint as a second wall.
- **Status streaming** — `BackgroundTasks` runs the analysis async; the client subscribes to SSE for `pending → processing → done | failed`. No Redis, no Celery.
- **Prompt versioning** — every `analyses` row stores `prompt_version`. New prompts coexist with old data; `jsonb` columns evolve without migrations. See [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer).
- **Auth (Clerk)** — added in build-order step 6, **after** the core loop works without auth. Public share routes stay unauthenticated.
- **Analytics (PostHog)** — wired in last (step 8).
- **Data retention** — `APScheduler` can run a daily sweep that nulls `resumes.raw_text` and deletes the R2 PDF when `RAW_TEXT_RETENTION_ENABLED=true` (default off; [D-017](./decisions.md#d-017-raw-resume-text-retention-is-opt-in-default-keep)). Analysis output is kept. See [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup).

## LLM provider strategy

Locked in [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover).

| Surface | v1 (free) | v2 candidate (if v1 quality is the bottleneck) |
| --- | --- | --- |
| Resume analysis + Cooked Score | **Gemini 2.0 Flash** | GPT-4o Mini |
| Red flag detection + rewrites | **Gemini 2.0 Flash** | GPT-4o Mini |
| Personalized interview questions (10–15) | **Gemini 2.0 Flash** | GPT-4o Mini |
| Flashcard generation | *Cut from v1.* See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share). | Gemini 2.0 Flash or Groq Llama if reintroduced |
| Answer feedback (text, plain prose, **no rubric in v1**) | **Gemini 2.0 Flash** *(stretch — only if cheap)* | **Claude Haiku 3.5** (best cheap model for structured rubric eval) |
| Fallback when primary fails | **Llama 3.3 70B via Groq** (free) | Same |
| Ultimate fallback when both fail | Regex heuristic (existing `useMemo` in `ResumeRoastDemo`) | Same |

Inside `backend/app/services/llm/router.py` the call pattern is:

```python
class LLMRouter:
    def route(self, task: str) -> LLMClient:
        return {
            "analyze":   gemini_flash,
            "questions": gemini_flash,
            "evaluate":  groq_llama,
            "feedback":  groq_llama,
        }[task]

    async def run(self, task: str, prompt, **kwargs):
        primary = self.route(task)
        secondary = groq_llama if primary is gemini_flash else gemini_flash
        try:
            return await primary.call(prompt, **kwargs)          # prompt caching ON
        except (RateLimit, ServerError, Timeout):
            try:
                return await secondary.call(prompt, **kwargs)
            except (RateLimit, ServerError, Timeout):
                return DegradedResult(reason="both_providers_unavailable")
```

The API route returns `degraded: true` to the frontend; the UI must surface it honestly ("using a backup model — quality may be lower") rather than pretending nothing happened.

### Env vars (backend)

- `GEMINI_API_KEY` — Google AI Studio free tier.
- `GROQ_API_KEY` — Groq free tier.

Lives in `backend/.env`. Full env-var list in [infra.md](./infra.md#environment-variables).

### Banned in v1

GPT-4o, Claude Sonnet, GPT-4o (paid full), or any other non-free model. Per [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback) + [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover).

## API surface (FastAPI, v1)

All routes prefixed `/api/v1/`. Slug-based public URLs, UUIDs never exposed externally. Full table in [infra.md → API contract](./infra.md#api-contract-v1).

```
POST /api/v1/resume/upload                ← multipart PDF or pasted text → pymupdf → R2 + Postgres
POST /api/v1/resume/{id}/analyze          ← enqueues BackgroundTask, streams SSE status
GET  /api/v1/resume/{id}/score
GET  /api/v1/resume/{id}/flags
GET  /api/v1/resume/{id}/questions
POST /api/v1/practice/answer              ← stretch v1
GET  /api/v1/share/{slug}                 ← public, unauthenticated
```

## Styling system

See [`design-system.md`](./design-system.md). Short version:

- Dark theme by default. Tokens live in `tailwind.config.ts` under `colors.lc.*` and CSS variables in `globals.css`.
- LeetCode orange (`#ffa116`) is the only brand accent.
- Difficulty colors (Easy `#00b8a3`, Medium `#ffc01e`, Hard `#ef4743`) double as semantic colors for risk / score severity.
- Inter for UI, JetBrains Mono for any "code-like" affordance (filenames, line numbers, `// comment` section headers, scores).

## Open questions

*(none right now)*

All v1 architectural questions are resolved as of 2026-05-12. Add new ones here when they appear.
- [ ] Where does redacted/anonymous benchmarking data live before there is a backend?
- [ ] Do we ever ship a light theme, or is dark-only part of the brand? Currently dark-only.
