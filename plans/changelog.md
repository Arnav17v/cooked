# Changelog

Reverse-chronological, high-signal log of meaningful changes. One line per change. Link issues / decisions where useful.

Format: `YYYY-MM-DD — area: short description (#ref)`

---

## 2026-05-29

- **product — interview prep planner:** `/plan` with `prep_plans`, `plan_days`, LLM generate/modify, quiz handoff, optional Web Push reminders (08:00 UTC).
- **product — plan two-phase execution:** overview → Initiate plan → per-day modules (notes/tasks/quiz) with progress bars and backlog highlighting.
- **product — plan lazy day modules:** per-day LLM generation with `note_guidelines.md`, today+2 on initiate, on-open for remaining days; `modules_status` on `plan_days`.
- **product — multi prep plans:** users can create, list, open, and delete multiple plans; dropped one-active-per-user DB constraint.
- **product — Coursera-style plan player:** curriculum sidebar with day accordions + single-module lesson panel with Prev/Next.

---

## 2026-05-22

- **backend — interview prompts:** added `industry_standard` question bucket; LLM now derives 3 core competency pillars for the target role and generates pillar questions for anything the resume does not cover (works for any role — SWE, marketing, PM, etc.).
- **backend — interview scoring:** rewrote `build_batch_score_system_prompt` signal rubric to anchor on technical correctness only (not communication style); `analysis` field now mandates a "The correct answer is..." teach-back whenever signal is yellow or red.

---

## 2026-05-21

- **backend — LLM upgrades**: migrated to modern `google-genai` SDK, implemented client connection pooling (reusing singletons), native async calls, strict response schemas, `json-repair` recovery, and `<resume_text>` XML tags for prompt injection protection.

## 2026-05-20

- **frontend — quiz:** questions tab lists last 5 completed quizzes; click opens `/quiz/results/[session_id]` with full analysis.

- **backend — quiz:** persist questions + answers in `final_summary`; `GET /interview/history` + `/interview/results/{id}`; score history capped at 5 with `session_id`.

- **backend — retention:** raw_text never timer-deleted (orphan 30d + PDF 24h sweep only); analyses capped at 10/user (no share_slug first); quiz sessions LRU 5 + 48h unviewed TTL; drop `cache_handle`, add `results_viewed_at`.

- **backend — quiz/notes LLM:** parallel question batches (`asyncio.gather`), 1500-word prompt cap, Pydantic `QuizBatchScoreLLMOutput` / `NotesGenerateLLMOutput` / `NotesUpdateLLMOutput`.

- **backend — LLM:** central registry at `app/services/llm/models.py` for Google chain order, Groq model id, and task→vendor priority; env overrides optional.

- **backend + frontend — dev:** with `DEV=1`, model-chain + vendor failover events surface as top-right toasts (roast SSE, quiz start/score API).

- **backend — retention:** raw-text + R2 PDF sweep is **opt-in** (`RAW_TEXT_RETENTION_ENABLED`, default off); see D-017. Fixes quiz `410` after the old 24h delete.

- **frontend — privacy:** roast upload footnote matches default (raw text kept for quizzes until re-upload).

- **frontend — quiz start:** parse `/interview/start` errors with `formatApiError`; map **410 / expired resume text** to clear copy instead of the generic `session_error.log` message.

## 2026-05-14

- **backend — interview LLM:** quiz + notes generation use **`LLMRouter` `task="analyze"`** (identical Gemini→Groq path as resume roast).

- **backend + frontend — uploads:** `users.anonymous_client_key` + `X-Cooked-Anonymous-Id` so anonymous browsers reuse one user; **always** delete prior resumes on upload (quiz history carried). Alembic `b3c4d5e6f7a8`.

- **backend — LLM:** after primary Gemma, try **`gemma-2-27b-it`** before `GEMINI_FALLBACK_MODEL` (Google chain in `gemini.py`).

- **notes:** **Motion** bottom sheet (`AnimatePresence`, scrim fade + panel `y: 100% → 0` with CSS **ease**), `md:w-[60%]` on desktop / full width phones; `motion.li` list stagger + `frontend/src/lib/motion-easing.ts`; plain-text `##`/`###`/`==highlight==` → HTML + TipTap **Highlight**; prompts updated for headings/highlights.

## 2026-05-13

- **backend — Gemma 4 31B:** `GEMINI_MODEL` default `gemma-4-31b-it` (Google API); SDK uses `models/gemma-4-31b-it`; relaxed JSON parsing for Gemma preamble; fallback default `gemini-2.0-flash`. D-009 text updated.

- **backend — Gemini path:** fixed `generate_json` tail (invalid `assert`/raise); primary + `GEMINI_FALLBACK_MODEL` with 429 retries before Groq; documented `GEMINI_*` in `.env.example`.

- **backend + frontend — roast v2 bundle:** Single Gemini/Groq JSON call for score + flags + 8–10 questions; pdfplumber extraction; `uploads/{id}.pdf` + immediate delete after parse; flat `/api/v1/score|flags|questions|sections/{resume_id}` + `POST /api/v1/analyze`; SSE `{step:…}` events; public `/share` payload is score/one-liner/role only. See [`plans/resume-roast-architecture.md`](./resume-roast-architecture.md).

- **backend — B2 uploads:** virtual-hosted addressing + `inject_host_prefix=False`; `before-send` still strips `Expect` and coerces body to `bytes`. Env **`R2_B2_PUT_SSE_AES256`** (default true) toggles explicit SSE-B2 header — try **`false`** if `IncompleteBody` persists with correct `Content-Length`.
- **step 0 — frontend move done.** Next.js code lives in `frontend/`. Root `.gitignore` covers both subdirs. Root `README.md` rewritten as a monorepo entry point. `frontend/` reinstalled cleanly, lint passes, `npm run dev` serves the landing page (`GET / 200` from port 3002). Fixed ten pre-existing `react/jsx-no-comment-textnodes` lint errors caused by raw `// section` text I introduced earlier in the LeetCode restyle — wrapped them in `{"// ..."}` JSX expressions.
- **step 0 — backend scaffolded.** Full `backend/` tree under [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog):
  - `pyproject.toml` with FastAPI + async SQLAlchemy + asyncpg + Alembic + pydantic-settings + pymupdf + `google-generativeai` + `groq` + boto3 (R2) + slowapi + APScheduler + ruff.
  - `app/main.py` boots FastAPI with CORS and an async lifespan that wires + starts/stops APScheduler.
  - `app/core/{config,scheduler,security,storage}.py` — pydantic-settings, APScheduler bootstrap with the daily retention job registered at 03:17 UTC, Clerk-stub auth (anon hashed-IP id until Step 6), R2 boto3 client.
  - `app/db/session.py` — async SQLAlchemy engine + `get_session` dependency + `Base`.
  - `app/models/` — `users`, `resumes` (with the `raw_text_deleted_at` column from [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup)), `analyses` (jsonb columns + `share_slug` + `prompt_version`), `questions`, `practice_sessions`.
  - `app/services/llm/` — task-routed `LLMRouter` with cross-vendor failover and a `degraded` fallback path per [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover). Vendor methods raise `NotImplementedError` so accidental usage fails loudly before Step 2.
  - `app/services/resume/` — `parser.py` with the 4000-word cap already enforced for pasted text; `retention.py` registered as the APScheduler daily job (stubbed sweep, real DB+R2 wiring in Step 1); `analyzer.py` + `scorer.py` empty stubs.
  - `app/services/questions/` — `generator.py` + `evaluator.py` empty stubs.
  - `app/api/v1/` — `router.py` aggregates `health` (real, returns `{"status":"ok"}`), `resume`, `analysis`, `questions`, `practice`, `share`. Non-health routes return `501` with explicit pointers to which build-order step lights them up.
  - Alembic configured (`alembic.ini`, `env.py` reads `DATABASE_URL` from `Settings`, `script.py.mako`, empty `versions/`).
  - `.env.example` covers every key the build order touches. `README.md` documents local dev + the hard rules.
- **agents**: created [`AGENTS.md`](../AGENTS.md) at the repo root + four `.cursor/rules/*.mdc` files that Cursor auto-loads on every prompt: `v1-guardrails.mdc` (always-apply scope + invariants), `v1-skip-list.mdc` (always-apply "do not build"), `frontend.mdc` (App Router + mobile-first + SSE + 5 required states), `backend.mdc` (LLM boundary + Alembic + APScheduler). Plans folder is the long form; the rules files are the short form — keep them in sync.
- **scope**: locked the **priority override** — after the core API works, build the score-card UI before auth/dashboards. Surfaced in [`current-goals.md`](./current-goals.md) and the always-apply Cursor rule.
- **anti-features**: expanded the v1 "do not build" list with engineering anti-features (SEO surfaces, accessibility audit, i18n, PWA, heavy analytics, Sentry, tests/Storybook, payment integrations, extra LLM models, light theme).
- **agent-instructions**: added a UX-invariants section (the 5 required states for every async surface; mobile-first 375px; SSE for >2s ops; Server Components by default). Verification checklist updated for mobile + OG-unfurl spot-checks.
- **repo**: locked **monorepo with `frontend/` + `backend/` subfolders**. Existing Next.js code at repo root needs to be moved into `frontend/` as the first action of Step 0. See [D-013](./decisions.md#d-013-monorepo-with-frontend--backend-subfolders).
- **infra**: decided to **skip the Render cron-pinger in v1** — honest "warming the model" frontend copy is the only cold-start mitigation until users complain. See [D-014](./decisions.md#d-014-skip-the-render-cron-pinger-in-v1).
- **retention**: locked **24-hour raw-resume-text retention**, then null + R2 delete via an in-process `APScheduler` daily job. Analysis output is kept forever. New `resumes.raw_text_deleted_at` column (additive, safe). Privacy copy: *"We delete your resume text within 24 hours. We keep only the analysis."* See [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup) + [database-schema.md](./database-schema.md).
- **infra**: added `APScheduler` to the backend stack — strictly in-process, no Redis/Celery.
- **tasks**: Step 0 expanded to include (a) the `frontend/` relocation, (b) Render + Vercel root-directory settings, (c) APScheduler stub. Step 1 now includes wiring the daily retention sweep and shipping the privacy copy.
- **docs**: paths updated to `frontend/...` across `setup.md`, `architecture.md`, `infra.md`, `agent-instructions.md`. All v1 open questions are now closed.
- **infra**: locked the full v1 infrastructure stack — **Next.js on Vercel + FastAPI on Render + PostgreSQL on Railway + Cloudflare R2 + Clerk + PostHog + pymupdf**. No Redis, no Celery, no Supabase. See [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog). New doc: [infra.md](./infra.md).
- **schema**: locked schema-evolution discipline — every change goes through **Alembic** migrations. `jsonb` columns (`score_breakdown`, `red_flags`, `rewritten_bullets`, `feedback`) absorb LLM-output evolution; `prompt_version` per analysis row tracks which prompt generated which shape. See [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer). New doc: [database-schema.md](./database-schema.md).
- **llm**: refined the LLM strategy from "Gemini primary + Groq fallback" to **task-based routing with cross-vendor failover**: Gemini for `analyze` + `questions`, Groq for `evaluate` + `feedback`. Both providers fall over to each other on failure; regex remains the ultimate fallback. Updated [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover).
- **scope**: PDF parsing is now in v1 via `pymupdf` on the backend. **D-002 (paste before PDF) is superseded.**
- **product rules baked into infra**: 3 analyses/user/day enforced at DB level before any LLM call, 4000-word input cap in `parser.py`, random `share_slug` for public URLs (never internal UUIDs), `prompt_version` recorded per analysis row.
- **tasks**: replaced the old 3-step P0 with the **8-step build order** — PDF extraction → Gemini analysis → Score card UI at `/share/[slug]` → Red flags → Question generation → Auth (Clerk) → Rate limiting + input cap → PostHog. See [tasks.md → P0](./tasks.md#p0--v1-build-order).
- **architecture**: rewrote `architecture.md` for the two-service reality — frontend tech stack table, backend tech stack table, target monorepo layout (`backend/` subfolder), v1 data flow diagram, full API surface.
- **setup**: rewrote `setup.md` for two-service local dev (Next.js + FastAPI + Alembic + two `.env` files).
- **agent-instructions**: added four new hard-no rules — no manual `ALTER TABLE`, no Redis/Celery in v1, no internal UUIDs in public URLs, no DB that pauses on inactivity. Updated the quick-map table for backend / DB / API routes.
- **scope**: tightened v1 scope to **three must-have features** (Cooked Score, Red Flag Detection with rewrites, Personalized Interview Questions 10–15) + one nice-to-have (text-only Answer Practice, no rubric). **Flashcards cut from v1.** Structured rubric scoring cut from v1. Locked the v1 success metric: *does someone screenshot the Cooked Score and share it?*. See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
- **architecture**: dropped `generateFlashcards()` from the `src/lib/llm.ts` planned API. Added a new share surface: `src/components/score-card.tsx` (reusable), `app/r/[id]/page.tsx` (clean share page), `app/r/[id]/opengraph-image.tsx` (`next/og` for unfurl).
- **tasks**: restructured P0 into three explicit steps — Step 1 *Score card / viral artifact first*, Step 2 *Free LLM stack*, Step 3 *Stretch (answer practice if cheap)*. Promoted OG share card from P2 to P0. Added cleanup task to remove the flashcards block from `ResumeRoastDemo`.
- **agent-instructions**: added two new hard-no rules — no v1 features beyond the three must-haves, and no feature-UI work before the score card exists.
- **llm**: locked the v1 provider stack — **Gemini 2.0 Flash** as primary (Google AI Studio free tier) + **Groq Llama 3.3 70B** as fallback + regex heuristic as ultimate fallback. GPT-4o, Claude Sonnet, and all paid models banned in v1. See [D-009](./decisions.md#d-009-llm-provider-choice-gemini-20-flash-primary--groq-llama-fallback).
- **architecture**: added "LLM provider strategy" section to `architecture.md` covering per-surface model assignment, primary→fallback→regex chain, env vars, and v2 candidates (Claude Haiku 3.5 for answer scoring if rubric quality is the bottleneck, GPT-4o Mini as generalist upgrade).
- **engineering rule**: **prompt caching from day 1** is now mandatory in `src/lib/llm.ts`. Long repeated system prompts (rubric + tone + schema) must use Google's native prompt caching.
- **tasks**: rewrote P0 with the locked provider choices, new files (`src/lib/llm.ts`, `app/api/score-answer/route.ts`), and explicit `degraded: true` UX handling.
- **scope**: locked v1 to run on a **completely free LLM**; paid/quality upgrade deferred to v2 after real user feedback. See [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback).
- **plans**: propagated the v1/v2 framing through `current-goals.md`, `roadmap.md`, `tasks.md`, `architecture.md`, `known-issues.md`. Added new requirements: provider abstraction in `src/lib/llm.ts`, per-IP rate limiting, graceful regex fallback on quota exhaustion, honest demo copy.

## 2026-05-11

- **plans/**: created the persistent `/plans` knowledge base (`README`, `project-overview`, `architecture`, `design-system`, `current-goals`, `roadmap`, `tasks`, `decisions`, `setup`, `known-issues`, `changelog`, `agent-instructions`).
- **design**: applied LeetCode-inspired dark theme across the whole app — `lc.*` color tokens in `tailwind.config.ts`, dark defaults in `globals.css`, Inter + JetBrains Mono wired via `next/font/google` in `layout.tsx`. See [D-006](./decisions.md#d-006-leetcode-inspired-dark-theme).
- **landing**: rebuilt `src/app/page.tsx` with LeetCode patterns — code-editor-style cooked-score card, roadmap as problem-list table, difficulty pills, mono section eyebrows (`// roadmap`, `// pricing`, …), featured pricing card with orange glow.
- **demo**: rebuilt `src/components/resume-roast-demo.tsx` as an editor + console pair (`resume.txt` / `output.console`), with `Run roast` CTA, mono textarea, color-coded score by difficulty.
- **landing**: added the phased Roadmap section (Build first / Monetize next / Later bet) and a navbar link to it.

## 2026-05 (earlier, project bootstrap)

- Initial scaffold via `create-next-app`: Next.js 15.1.2, React 19, TypeScript 5, Tailwind 3.4.
- shadcn/ui initialized (`button.tsx`, `card.tsx` only).
- First-pass landing page in the original beige/savage palette (since superseded — see 2026-05-11).
- Original `ResumeRoastDemo` with regex heuristics (still in place; UI restyled).
