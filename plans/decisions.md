# Decisions

Lightweight ADR log. Add a new entry whenever you make a non-obvious product or technical choice. Do not delete entries — supersede them with a new one.

Format:

> ### D-XXX: Short title
> **Date**: YYYY-MM-DD
> **Status**: Accepted | Superseded by D-YYY | Deprecated
> **Context** · **Decision** · **Consequences**

---

### D-020: In-Depth Analysis — on-demand, separate from roast bundle

**Date**: 2026-06-03
**Status**: Accepted

- **Context**: The roast bundle’s `ai_in_depth_review` string is a short narrative, not the six-section hiring-manager product users need (market position, inner monologue, interview forecast, etc.).
- **Decision**:
  - Store structured output in `analyses.indepth_analysis` (JSONB) + `indepth_generated_at`.
  - Generate via dedicated `POST /resume/{id}/analysis/{analysis_id}/indepth` (cached until explicit regenerate).
  - LLM input is **resume text** + target role + experience level + optional JD; not score/flags/quiz data.
  - Do **not** change the roast pipeline or remove `ai_in_depth_review` from the bundle yet; dashboard tab ignores the legacy field.
- **Consequences**:
  - Extra LLM call per user action (not counted against daily roast cap).
  - Dashboard tab renamed **In-Depth Analysis** with richer UI (radar, hire pill, accordions).

---

### D-019: Interview prep first, Resume Score terminology, diagnostic score report

**Date**: 2026-06-03
**Status**: Accepted

- **Context**: The prior UI overhaul plan over-indexed on "resume roast" and a meme/share card. User direction changed: interview prep is the main product focus, while resume scoring is the diagnostic entry point.
- **Decision**:
  - Public positioning is **interview prep first**.
  - Visible UI copy says **Resume Score**, not "resume roast."
  - Visible UI copy says **AI Insights**, not "flags" or "red flags."
  - Add an **AI In-Depth Review** surface for the longer narrative analysis.
  - Score reports must be multi-dimensional, not just one number. Required dimensions (four, sum max 95, total shown `/100`): ATS `0-20`, Content `0-40`, Writing `0-10`, Job Match `0-25`. **Ready** was removed (vague, overlapped Job Match); legacy five-dim and 15/45/10/30 rows are migrated on read.
  - Stop using cooked/meme images on score cards and share cards.
  - The authenticated score page should show a resume PDF preview beside the score/report on desktop, with a text-preview fallback for pasted resumes. Public share pages must not expose private resume previews unless redacted and explicitly approved.
- **Consequences**:
  - D-010's share-card emphasis is refined: score/share still matters, but the main product story is now resume-powered interview prep.
  - Existing route names such as `/roast` may remain temporarily for compatibility, but visible copy should migrate away from "roast."
  - Backend/API may need additive score-dimension fields; any schema change must use Alembic and preserve old analyses.
  - `ScoreCard` should become a professional diagnostic report component instead of a meme-led artifact.

---

### D-018: Interview prep planner (`/plan`)

**Date**: 2026-05-29
**Status**: Accepted

- **Context**: User-requested feature outside locked v1 guardrails; needs day-by-day plans from JD + roast, NL edits, quiz linkage, optional push reminders.
- **Decision**: Postgres tables `prep_plans`, `plan_days`, `push_subscriptions`; one active plan per user (partial unique index); LLM via existing `analyze` router task; public UUID only behind Clerk auth; morning push via APScheduler + `pywebpush` when VAPID env is set; quiz starts through existing `/quiz/start` handoff + `POST /interview/start`.
- **Consequences**: Extra LLM cost surface — daily generate/modify caps; push is no-op without VAPID keys; scope explicitly overrides v1 skip list for this feature only.

---

### D-001: Use Next.js 15 App Router + Tailwind + shadcn

**Date**: 2026-05 (project bootstrap)
**Status**: Accepted

- **Context**: Solo dev, no funding, wants speed. Needs SSR-ish defaults and good Vercel deploy ergonomics.
- **Decision**: Next.js 15.1.2 (App Router), React 19, Tailwind 3.4, shadcn/ui scaffolding (only `button`, `card` adopted so far), `lucide-react` for icons.
- **Consequences**: Standard, boring, fast. No state library yet — local `useState` is enough.

---

### D-002: Paste before PDF *(SUPERSEDED by [D-011](#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog))*

**Date**: 2026-05-11
**Status**: **Superseded 2026-05-12.** PDF parsing is now in v1 via `pymupdf` on the FastAPI backend, with R2 for blob storage. Both paste and PDF upload are supported. The build order ([tasks.md](./tasks.md)) starts with PDF extraction + Postgres storage.

- **Original context**: PDF parsing was deemed a v2 trap to avoid in the initial Next.js-only plan.
- **Why superseded**: The new infra stack ([D-011](#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog)) introduces a Python backend where `pymupdf` is well-supported and free, removing the friction that justified deferring it.

---

### D-003: Defer community

**Date**: 2026-05-11
**Status**: Accepted

- **Context**: Forum, ranked queues, credit economy, verified stories all need critical mass. A community of 50 looks dead and hurts the brand.
- **Decision**: Build **zero** community features until there are ~1,000 active users on the core loop. Until then, the landing page may show them as "Later bet" roadmap items only.
- **Consequences**: Smaller surface to build and maintain. Fewer monetization knobs in v1 (intentional).
- **Trigger to revisit**: 1,000 active users + retention proven on the core loop.

---

### D-004: Monetization — one product, not five

**Date**: 2026-05-11
**Status**: Accepted

- **Context**: The original feature list mixed credits, subscriptions, JD targeting, ticket sales, paywalled stories — five revenue models, zero validated.
- **Decision**: First monetization attempt is a **one-time "Full Roast Report"** in the ₹99–₹299 range. No subscription, no credits, no seminars until this is validated.
- **Consequences**: Cleaner pricing UX. Lower friction. Easy to A/B price. Fewer integrations.
- **When to revisit**: Once there are paying users on the one-time report, consider an "Interview Pass" (7-day prep) tier — already drafted on the landing page as a *marketing* placeholder, not yet wired to payments.

---

### D-005: Tone calibration

**Date**: 2026-05-11
**Status**: Accepted

- **Context**: "Savage" is the brand, but anxious users (especially juniors) need actionable help, not just abuse. Two reviewers flagged this risk independently.
- **Decision**:
  - Headline / marketing copy: savage, fun, on-brand.
  - **Actual feedback content**: brutally honest but **constructive** — every red flag must be paired with a fix-it suggestion or an interview question that surfaces the gap.
  - No content that mocks the user as a person. Mock the *bullet*, not the human.
- **Consequences**: Slightly more LLM token spend (constructive add-on). Worth it.

---

### D-006: LeetCode-inspired dark theme

**Date**: 2026-05-11
**Status**: Accepted

- **Context**: User asked for the whole app to look like LeetCode.
- **Decision**: Dark theme by default. Single brand accent `#ffa116`. Difficulty colors as semantic risk colors. Inter + JetBrains Mono. No light mode. See [`design-system.md`](./design-system.md).
- **Consequences**: Strong, consistent identity. New components must conform — see anti-patterns list in `design-system.md`.

---

### D-007: Local heuristics demo before real AI

**Date**: 2026-05-11
**Status**: Accepted

- **Context**: Need a believable interactive demo on the landing page before paying for LLM calls.
- **Decision**: `ResumeRoastDemo` runs regex against the pasted text to produce a fake-but-illustrative score, red flags, and questions. Pure client-side, `useMemo`, no network.
- **Consequences**: Zero-cost demo. Risk: a user might think the real product is also "just regex." Mitigation: Phase 1 swaps in the real LLM behind the same UI.

---

### D-008: v1 ships on a completely free LLM; v2 upgrades after user feedback

**Date**: 2026-05-12
**Status**: Accepted

- **Context**: Solo dev, no funding, no validated demand. Paying for premium LLM APIs before there is a single returning user is the wrong risk profile. The whole point of v1 is to prove the loop ("does anyone share their cooked score?") not to maximize answer quality.
- **Decision**: **Version 1 of the application is built entirely on a free-tier / no-cost LLM model.** Specific provider locked in [D-009](#d-009-llm-provider-choice-gemini-20-flash-primary--groq-llama-fallback). The rule is **zero ongoing API cost in v1**.
- **v2 trigger**: Real user feedback has been collected, the loop shows signs of working (some shares, some returning users, a first paying user for the Full Roast Report), and we know which dimensions of quality the free model is hurting us on. Only then do we move to a paid/higher-quality model.
- **Consequences**:
  - v1 output quality will be lower than what is theoretically possible. That is accepted.
  - The UI must be honest about this: ship copy on the demo like "powered by a free experimental model" rather than overselling.
  - The roast prompt must be defensive — narrower rubric, conservative scoring, explicit instructions to refuse rather than hallucinate when unsure (see [D-005](#d-005-tone-calibration)).
  - Architectural constraint: the route handler must abstract the provider behind a single function so swapping for v2 is a one-file change, not a rewrite. See [`architecture.md`](./architecture.md#planned-architecture-when-mvp-work-starts).
  - Rate limits on free tiers are aggressive — Phase 1 needs per-IP rate limiting AND a graceful fallback to the regex heuristic demo when the free quota is exhausted.

---

### D-009: LLM routing — Gemini for analyze/questions, Groq for evaluate/feedback, cross-vendor failover

**Date**: 2026-05-12
**Status**: Accepted *(refined by [D-011](#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog) from "single primary + fallback" to **task-based routing**)*

- **Context**: D-008 locked the strategy (free in v1). This decision picks the actual models and how they are routed per task.
- **Decision** — task-based router, implemented in `backend/app/services/llm/router.py`:
  - **Google Generative Language API** (`GEMINI_MODEL`, **Gemini** or **Gemma** ids — default **Gemma 4 31B IT** with **Gemini 2.0 Flash** as typical fallback via `GEMINI_FALLBACK_MODEL`) handles `analyze` (resume analysis + cooked score + red flags + rewritten bullets) and `questions` (10–15 personalized interview questions).
  - **Groq Llama 3.3 70B** (Groq Cloud, free tier) handles `evaluate` and `feedback` (answer practice, when shipped — stretch v1 per [D-010](#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share)).
  - **Cross-vendor failover**: if the task's primary provider returns 429 / 5xx / timeout, the router falls over to the other provider before giving up. Single-vendor failures must not break the UX.
  - **Ultimate fallback**: if both providers fail, the API returns a `degraded: true` flag and the frontend gracefully shows the regex heuristic (or an honest "try again in a minute") instead of a hard error.
  - **Banned in v1**: GPT-4o, Claude Sonnet, GPT-4o (full), or any non-free tier. Overkill and violates [D-008](#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback).
  - **Engineering rule from day 1**: implement **prompt caching** on every call. Both Google and Anthropic support it natively; the long system prompts (rubric, tone instructions, output schema) repeat across every request and caching cuts cost ~90%. Even on free tier, caching matters because it conserves quota.
- **Why these picks**:
  - **Gemini 2.0 Flash** — fast, long context (handles full resumes), genuinely capable enough for our v1 feature surfaces, and the cheapest paid tier once we eventually scale past free quotas. Single-vendor v1 keeps the abstraction surface small.
  - **Gemma 4 31B IT** — same Google API key as Gemini; usable as **`GEMINI_MODEL`** primary when we want open-model behavior or different quota curves on the free tier.
  - **Groq + Llama 3.3 70B** — free, very fast, comparable quality, and crucially **a different vendor**. If Google's quota or service degrades, we still serve users. Also a useful A/B target if Gemini's structured outputs disappoint.
- **v2 considerations (not implemented yet)**:
  - If answer scoring quality is the weak link in user feedback, switch the *answer feedback* call (only that one) to **Claude Haiku 3.5** — it is the strongest cheap model for structured rubric-based evaluation. Paid but cheap, so this is a v2 move per [D-008](#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback), not v1.
  - If overall quality is the weak link, consider GPT-4o Mini as a generalist upgrade.
- **Consequences**:
  - `src/lib/llm.ts` must implement a primary+fallback pattern, not just a single call. See [`architecture.md`](./architecture.md#llm-provider-strategy).
  - Two SDK dependencies in v1: `@google/generative-ai` and `groq-sdk` (or use raw `fetch` against either REST API to keep deps light).
  - Two env keys: `GEMINI_API_KEY`, `GROQ_API_KEY`. Both free-tier.
  - Prompt-caching infrastructure (cache keys, TTLs, content boundaries) must be designed before the first real call ships — retrofitting it later wastes early quota.
- **Supersedes**: the "Which specific free LLM" open question previously parked under *Pending decisions*.

---

### D-010: v1 scope locked at 3 must-haves; success = screenshot-and-share

**Date**: 2026-05-12
**Status**: Accepted (supersedes earlier v1 scope in [`current-goals.md`](./current-goals.md))

- **Context**: Previous Phase 1 scope was "Resume Roast + Cooked Score + Personalized Questions + Basic Answer Feedback + Flashcards." That's already creeping. Re-tightened.
- **Decision**: v1 is **three features**, period.
  1. **Resume Upload + Cooked Score** — paste/upload, pick role, get score + brutal breakdown. The score card **must be designed as a screenshot-able artifact** before any other UI work happens.
  2. **Resume Red Flag Detection** — point to the exact bullet, rewrite it. Not generic "add metrics" advice.
  3. **Personalized Interview Questions** — 10–15 questions pulled directly from the user's bullets/projects, specific enough that a generic ChatGPT prompt could not produce them.
- **Nice-to-have** (ship only if <1 day of work): text-only **Answer Practice** with basic prose feedback ("here's what was good, here's what was weak"). **No scoring rubric** in v1.
- **Cut from v1** (previously included in Phase 1):
  - **Flashcards** — demoted. Nice but not core.
  - **Structured rubric scoring** on answer feedback — demoted. Plain-prose feedback only.
- **Stays cut** (already excluded):
  - Voice mock interviews, community/forum, ranked queues, credits, seminars, JD targeting, "Can AI Replace Me?". All v2 or later.
- **The one metric that defines v1 success**:
  > **Does someone screenshot the Cooked Score and share it?**
  If yes → v1 worked. Everything else is secondary. **Design the score card first, features second.**
- **Consequences**:
  - `src/lib/llm.ts` no longer needs `generateFlashcards()`. Drop it from the API. See [`architecture.md`](./architecture.md#llm-provider-strategy).
  - `scoreAnswer()` becomes optional v1, required v2.
  - **OG share card / screenshot-optimized score card** is now P0 in [`tasks.md`](./tasks.md), not P2.
  - The existing `ResumeRoastDemo` component renders flashcards. That output panel should be revisited: either match v1 scope (drop the flashcards block) or keep it as a forward-looking "v2 preview." Default: drop, so promise = product.
- **Supersedes**: earlier "Build first" wording in [`current-goals.md`](./current-goals.md) and [`roadmap.md`](./roadmap.md) — these are updated to match.

---

### D-011: Backend + infra stack — FastAPI + Postgres + R2 + Clerk + PostHog

**Date**: 2026-05-12
**Status**: Accepted *(supersedes [D-002](#d-002-paste-before-pdf-superseded-by-d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog) and refines [D-009](#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover))*

- **Context**: The plan moved from "Next.js client + a single `/api` route" to a proper two-service architecture once PDF parsing, persistence, share pages, and rate limiting got added to v1 scope. Doing this in Node + Next.js API routes is awkward; the Python ecosystem (`pymupdf`, FastAPI async, Alembic, SQLAlchemy) is the cleaner fit for the backend half.
- **Decision**:
  - **Frontend** — Next.js 15 on Vercel. Handles marketing surface, app shell, dashboard, `/share/[slug]` page, and OG image generation via `next/og`.
  - **Backend** — FastAPI on Render (free 750 hrs/mo). Async SQLAlchemy + Alembic. `BackgroundTasks` + SSE for the analyze flow. **No Redis, no Celery in v1** — explicit anti-pattern until traffic data proves the need.
  - **Database** — PostgreSQL on Railway. Chosen over Supabase because Railway does **not** pause on inactivity. Schema in [database-schema.md](./database-schema.md).
  - **Blob storage** — Cloudflare R2 for PDFs (S3-compatible, 10 GB free).
  - **Auth** — Clerk (10k MAU free). Wired in **only after the core loop works end-to-end** — see build order in [tasks.md](./tasks.md).
  - **Analytics** — PostHog (1M events/mo free). Wired in **last**.
  - **PDF parsing** — `pymupdf` server-side on FastAPI.
  - **LLM routing** — task-based per [D-009](#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover): Gemini for analyze + questions, Groq for evaluate + feedback, cross-vendor failover.
- **Key product rules baked into the infra**:
  - **Rate limit: 3 analyses per user per day**, enforced at DB level (`users.analyses_today` + `users.last_analysis_date`) **before** the LLM call ever fires.
  - **Input cap: 4000 words max**, enforced in `services/resume/parser.py` before storage. Truncation is explicit, never silent inside the LLM layer.
  - **Public URLs use random `share_slug`s**, never internal UUIDs.
  - **Every `analyses` row stores `prompt_version`** so we can A/B prompts safely and debug regressions.
- **Banned in v1**:
  - Redis, Celery, worker queues. `BackgroundTasks` + SSE is enough until proven otherwise.
  - Supabase as primary DB (pauses on inactivity).
  - Direct LLM SDK imports outside `backend/app/services/llm/` (backend) or `src/lib/api.ts` calling the LLM directly from the frontend (it doesn't — frontend talks only to FastAPI).
- **Consequences**:
  - Two codebases / services to run. Reflected in [setup.md](./setup.md).
  - Render cold-starts on free tier — honest UI copy ("warming the model") + optional cron-pinger to keep it warm.
  - PDF parsing is now in v1 — [D-002](#d-002-paste-before-pdf-superseded-by-d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog) is superseded.
  - Schema evolution discipline matters now — see [D-012](#d-012-alembic-migrations--jsonb-as-evolution-buffer).
  - **Effective v1 cost: ₹0.** Budget ₹800–2000/mo once free tiers are outgrown.

---

### D-012: Alembic migrations + jsonb as evolution buffer

**Date**: 2026-05-12
**Status**: Accepted

- **Context**: With a real database now in v1 ([D-011](#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog)), schema changes will be ongoing for the life of the product. Need a discipline that lets v2/v3 add features without corrupting v1 data.
- **Decision**:
  - **All schema changes go through Alembic migrations.** No manual `ALTER TABLE` in production, ever.
  - **`jsonb` columns are the LLM-output evolution buffer.** `score_breakdown`, `red_flags`, `rewritten_bullets`, `feedback` are intentionally `jsonb`. As prompts evolve, old rows keep their old shape, new rows get the new shape, and `prompt_version` records which to expect.
  - **Safe schema ops** (do freely): add new table, add new column with default, add index, add FK to a new table.
  - **Dangerous schema ops** (write the migration carefully, deploy in stages): rename column, drop column, change column type, add `NOT NULL` with no default. Use add-then-backfill-then-drop patterns.
- **Consequences**:
  - Adding v2 features (flashcards, community, subscriptions, etc.) does not touch existing v1 rows.
  - The Alembic history is the rollback plan.
  - See [database-schema.md → Schema evolution rules](./database-schema.md#schema-evolution-rules) for the full reference.

---

### D-013: Monorepo with `frontend/` + `backend/` subfolders

**Date**: 2026-05-12
**Status**: Accepted

- **Context**: Solo dev, one PR per change typically touches both sides, no cross-repo coordination headache. Split repos only pay off with separate teams.
- **Decision**: One git repo. Two top-level subfolders:
  - `frontend/` — the Next.js app (currently sitting at the repo root and will be moved as part of Step 0).
  - `backend/` — the FastAPI app (to be scaffolded at Step 0).
- **Workspace tooling**: not required in v1. Keep each side's package manager native (`npm` for frontend, `uv`/`pip` for backend). Add `pnpm`/`npm` workspaces only if a shared TypeScript types package becomes useful.
- **Consequences**:
  - **Frontend relocation is part of Step 0.** Move `package.json`, `tailwind.config.ts`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `components.json`, `eslint.config.mjs`, `public/`, `src/` from the repo root into `frontend/`. Update any path-aware tooling (Cursor/IDE configs, deploy configs).
  - Dev servers run from inside their subfolders (`cd frontend && npm run dev`, `cd backend && uvicorn ...`).
  - Vercel deploy must be pointed at `frontend/` as the project root.
  - Render deploy must be pointed at `backend/` as the project root.

---

### D-014: Skip the Render cron-pinger in v1

**Date**: 2026-05-12
**Status**: Accepted (defer)

- **Context**: Render's free tier spins down after ~15 min of inactivity. First request after a sleep adds ~30s. At zero users this is annoying, not blocking.
- **Decision**: **Do not** wire a cron-pinger in v1. Honest "warming the model" copy on the frontend handles the UX. When real users complain about cold starts, set up a 10-minute job (cron-job.org or similar hitting `GET /api/v1/health` every 5–10 min).
- **Consequences**: One less moving piece in v1. The cold-start UX hint in the frontend becomes load-bearing — must ship at Step 7 (rate limiting + states).

---

### D-015: 24-hour raw resume text retention + APScheduler cleanup

**Date**: 2026-05-12
**Status**: Accepted

- **Context**: We have to choose between three retention models for `resumes.raw_text`: keep forever / keep N days / delete after analysis. Two pressures: a clean privacy story ("we don't keep your resume") and small DB footprint.
- **Decision**:
  - **Keep `resumes.raw_text` for 24 hours after creation**, then null it out.
  - **Keep analysis output (`analyses.*`, `questions.*`, score, flags, rewrites) for the lifetime of that resume row** — that's what the user reads and shares until they replace the roast ([D-016](#d-016-one-active-roast-per-signed-in-user-quiz-score-history-only)).
  - Implementation: add a nullable timestamp column `raw_text_deleted_at` to `resumes` via Alembic. A daily APScheduler job inside FastAPI nulls `raw_text` and sets `raw_text_deleted_at` for rows older than 24h.
  - **APScheduler is the scheduler** — runs inside the FastAPI process, no Redis, no Celery, consistent with [D-011](#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
  - **PDFs on R2** follow the same rule: delete the original PDF object 24h after upload via the same job. Only the analysis output persists.
- **Consequences**:
  - Privacy copy is simple and honest: *"We delete your resume text within 24 hours. We keep only the analysis."*
  - Tiny DB footprint over time.
  - Re-running the analysis after 24h requires a fresh upload. That's an acceptable trade.
  - **Update (D-016)**: For a **signed-in** user, a **new upload replaces** the prior `resumes` row (and cascaded analysis/notes/questions/sessions). Only **`resumes.interview_quiz_scores`** is carried forward onto the new resume (capped). Anonymous uploads still use a disposable user row per session (unchanged).
  - The cleanup job is single-instance-safe by design — Render's free tier runs one web service.
- **Schema impact**: see [database-schema.md](./database-schema.md). Single new column on `resumes`, additive only ([D-012](#d-012-alembic-migrations--jsonb-as-evolution-buffer)).
- **Update (D-017)**: The sweep is **opt-in** via `RAW_TEXT_RETENTION_ENABLED` (default off). Product default is to **keep** `raw_text` and R2 PDFs until re-upload.

---

### D-016: One active roast per signed-in user; quiz score history only

**Date**: 2026-05-14
**Status**: Accepted

- **Context**: Multiple `resumes` rows per Clerk user accumulated roasts, notes, and `interview_sessions` (full turn payloads). Goal: **one current roast** per account, with **durable history only** for mock-quiz final scores (`resumes.interview_quiz_scores`).
- **Decision**:
  - On **signed-in** `POST /resume/upload`, **delete** all existing `resumes` for that `users.id`, then insert the new resume. **Copy** the prior resume's `interview_quiz_scores` (normalized, last `MAX_QUIZ_SCORE_HISTORY` entries) onto the new row before delete so score history survives re-uploads.
  - **Anonymous** uploads unchanged (each anonymous flow still gets a fresh `users` row from `resolve_upload_user`).
  - On **static** `POST /interview/start`, **delete** all `interview_sessions` for that `resume_id` so old sessions and `section_quiz_tags` do not accumulate.
  - After **`POST /interview/score`**, **delete** the completed `interview_sessions` row (CASCADE removes `section_quiz_tags`). Weak flags on notes are already written before deletion.
- **Consequences**: Old share slugs for prior resumes stop resolving after a new upload. `GET /interview/summary/{id}` only works while an adaptive session row still exists (batch quiz does not rely on it).

---

### D-017: Raw resume text retention is opt-in (default: keep)

**Date**: 2026-05-20  
**Status**: Accepted

- **Context**: The 24h auto-delete ([D-015](#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup)) broke flows that still need `raw_text` (e.g. interview quiz) days after the roast.
- **Decision**: `Settings.raw_text_retention_enabled` defaults to **false**. The APScheduler job still runs daily but **no-ops** unless the env flag is set. Operators who want the old privacy/footprint story set `RAW_TEXT_RETENTION_ENABLED=true` (and tune `RAW_TEXT_RETENTION_HOURS` if needed).
- **Consequences**: Privacy copy must **not** claim automatic 24h deletion unless the flag is enabled in that deployment. DB/R2 grow with stored resumes until users replace roasts.

---

## Pending decisions (open)

*(none — all open questions are resolved as of 2026-05-12. Add a question here when it appears.)*
