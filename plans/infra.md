# Infrastructure

Locked by [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog). Anything that wants to deviate from this needs a new ADR.

## Services map

```
Browser
  │
  ▼
Next.js 15 (Vercel)                  ← marketing + app shell + share pages + OG images
  │  fetch/SSE
  ▼
FastAPI (Render free tier)           ← all stateful logic, LLM orchestration, PDF parsing
  │
  ├──→ Gemini 2.0 Flash (Google AI Studio, free tier)
  ├──→ Groq Llama 3.3 70B (Groq Cloud, free tier)
  ├──→ PostgreSQL (Railway)
  └──→ Cloudflare R2 (PDF blob storage)

Cross-cutting:
  - Clerk        → auth (added AFTER core loop works end-to-end)
  - PostHog      → product analytics (added last)
```

## Stack

| Layer | Service | Tier | Notes |
| --- | --- | --- | --- |
| Frontend host | Vercel | Free | Already standard for Next.js 15. |
| Backend host | Render | Free 750 hrs/mo | FastAPI web service. Expect cold starts. |
| LLM (analyze + questions) | Google Gemini 2.0 Flash | Free tier | See [D-009](./decisions.md#d-009-llm-provider-choice-gemini-20-flash-primary--groq-llama-fallback) + [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog). |
| LLM (evaluate + feedback) | Groq Llama 3.3 70B | Free tier | Task-routed, **not** just a fallback. |
| Database | Railway Postgres | $5 credit then ~$5/mo | Chosen over Supabase because it does **not** pause on inactivity. |
| Blob storage (PDFs) | Cloudflare R2 | Free 10 GB | S3-compatible. |
| Auth | Clerk | Free up to 10k MAU | Wired in only **after** core loop is working. |
| Analytics | PostHog | Free 1M events | Wired in **last**. |
| PDF parsing | `pymupdf` | OSS | Server-side in FastAPI. |
| Async work | FastAPI `BackgroundTasks` + SSE | — | **No Redis, no Celery** until real traffic proves it. |
| Scheduled jobs | `APScheduler` (in-process) | OSS | Daily resume-text retention sweep — see [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup). |
| DB migrations | Alembic | OSS | Every schema change is a migration. See [database-schema.md](./database-schema.md). |

## Banned (anti-stack)

- **Redis / Celery** in v1 — `BackgroundTasks` + SSE is enough.
- **Supabase** as primary DB — pauses on inactivity, kills the UX.
- **Vercel functions** for the long stuff — Render handles the heavy work; Vercel stays the edge.
- **Direct LLM SDK imports outside `services/llm/`** in the backend, or outside `src/lib/llm.ts` in the frontend.

## Repo layout (monorepo)

Locked by [D-013](./decisions.md#d-013-monorepo-with-frontend--backend-subfolders). Two top-level subfolders, no workspace tooling in v1.

> **Migration note**: as of this writing, the Next.js code lives at the repo root, not inside `frontend/`. The first action of Step 0 is to move it. See [tasks.md → Step 0](./tasks.md#step-0--pre-work-do-once-before-step-1).

```
cooked/
├── plans/                           # docs (here)
├── frontend/                        # Next.js (move existing src/ + configs here)
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   ├── components.json
│   ├── eslint.config.mjs
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── (auth)/              # Clerk-gated; added at step 6
│       │   │   ├── login/
│       │   │   └── signup/
│       │   ├── (dashboard)/         # added after core loop works
│       │   │   ├── dashboard/
│       │   │   └── resume/
│       │   │       ├── upload/
│       │   │       ├── [id]/analysis/
│       │   │       ├── [id]/questions/
│       │   │       └── [id]/practice/
│       │   └── share/[slug]/        # public, unauthenticated, viral mechanic
│       ├── components/
│       │   ├── resume-roast-demo.tsx
│       │   ├── score/               # ScoreCard component — see D-010
│       │   ├── resume/
│       │   ├── questions/
│       │   ├── practice/
│       │   └── ui/
│       └── lib/
│           ├── utils.ts
│           ├── api.ts               # FastAPI client (added at step 1)
│           └── auth.ts              # Clerk helpers (added at step 6)
└── backend/                         # FastAPI (to be created at step 0)
    ├── pyproject.toml
    ├── alembic.ini
    └── app/
        ├── main.py
        ├── api/v1/routes/
        │   ├── auth.py
        │   ├── resume.py
        │   ├── analysis.py
        │   ├── questions.py
        │   └── practice.py
        ├── core/
        │   ├── config.py
        │   ├── security.py
        │   ├── storage.py           # R2 client
        │   └── scheduler.py         # APScheduler — daily retention sweep (D-015)
        ├── services/
        │   ├── llm/
        │   │   ├── gemini.py
        │   │   ├── groq.py
        │   │   └── router.py
        │   ├── resume/
        │   │   ├── parser.py        # pymupdf
        │   │   ├── analyzer.py
        │   │   ├── scorer.py
        │   │   └── retention.py     # 24h sweep — see D-015
        │   └── questions/
        │       ├── generator.py
        │       └── evaluator.py
        ├── models/                  # SQLAlchemy
        └── db/
            ├── session.py           # async session
            └── migrations/          # alembic
```

## API contract (v1)

All routes prefixed `/api/v1/`. Slug-based public URLs, UUIDs never exposed externally.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/resume/upload` | Multipart PDF or pasted text. Returns `resume_id`. Stores PDF in R2 + extracts text + caps at 4000 words. |
| POST | `/resume/{id}/analyze` | Enqueues background analysis. Returns `analysis_id` + initial `status: pending`. |
| GET | `/resume/{id}/score` | Returns cooked score + breakdown + `share_slug`. |
| GET | `/resume/{id}/flags` | Returns red flags with rewritten bullets. |
| GET | `/resume/{id}/questions` | Returns 10–15 personalized interview questions. |
| POST | `/practice/answer` | Submits an answer to one question; returns prose feedback. **Stretch v1.** |
| GET | `/share/{slug}` | Public, unauthenticated score view used by `/share/[slug]` on the frontend. |

Status flow (each analysis row): `pending → processing → done | failed`. The frontend listens via SSE on `/resume/{id}/analyze` (or polls `/score`) until status is `done`.

## Environment variables

Frontend (`.env.local`):

```
NEXT_PUBLIC_API_URL=                # FastAPI base URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=  # added at step 6
CLERK_SECRET_KEY=                   # added at step 6
NEXT_PUBLIC_POSTHOG_KEY=            # added at step 8
NEXT_PUBLIC_POSTHOG_HOST=
```

Backend (`backend/.env`):

```
DATABASE_URL=                       # Railway Postgres
GEMINI_API_KEY=
GROQ_API_KEY=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
CLERK_SECRET_KEY=                   # added at step 6
POSTHOG_API_KEY=                    # added at step 8
ALLOWED_ORIGINS=                    # CORS for the Next.js origin
```

All key names mirror in `.env.example` files (no values committed).

## Cost model

| Service | v1 cost | Notes |
| --- | --- | --- |
| Vercel | ₹0 | Free hobby. |
| Render | ₹0 | 750 hrs/mo free; one always-on web service uses ~720. |
| Railway Postgres | ₹0 then ~₹400/mo | $5 free credit, then ~$5/mo at lowest tier. |
| Cloudflare R2 | ₹0 | 10 GB + 10M Class A ops/mo free. |
| Clerk | ₹0 | 10k MAU free. |
| PostHog | ₹0 | 1M events/mo free. |
| Gemini 2.0 Flash | ₹0 | Free tier. |
| Groq Llama 3.3 70B | ₹0 | Free tier. |

**Effective v1 cost: ₹0** until traffic outgrows the free tiers. Budget **₹800–2000/month** as the realistic post-free-tier ceiling.

## Cold-start risk (Render free tier)

Render's free web services spin down after ~15 min of inactivity. First request after a sleep adds ~30s.

**v1 stance** ([D-014](./decisions.md#d-014-skip-the-render-cron-pinger-in-v1)): **do not** set up a cron-pinger. The frontend's honest "warming the model" copy handles the UX. Wire a pinger only when real users complain about cold starts — it's a 10-minute job (cron-job.org pinging `GET /api/v1/health` every 5–10 min) when it becomes load-bearing.

The cold-start loading state in the frontend (Step 7 of the build order) is therefore **mandatory**, not optional.

## Data retention

Locked by [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup).

- **`resumes.raw_text` and the corresponding R2 PDF object are deleted 24h after upload.**
- The `analyses`, `questions`, and `practice_sessions` rows are kept forever — that's the value the user comes back for.
- Implementation: an `APScheduler` job inside the FastAPI process runs daily, sweeps `resumes` rows with `created_at < now() - 24h AND raw_text_deleted_at IS NULL`, nulls the text, deletes the R2 object, stamps `raw_text_deleted_at`.
- Privacy copy to ship: *"We delete your resume text within 24 hours. We keep only the analysis."*

## Observability (minimal in v1)

- FastAPI default logs to stdout, picked up by Render's log viewer.
- PostHog handles client-side product analytics from step 8 onward.
- Error tracking (Sentry, etc.) — **not in v1**. Print + read Render logs.
