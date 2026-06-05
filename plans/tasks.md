# Tasks

Active, concrete next steps. Check the box when complete and add a one-line note in [`changelog.md`](./changelog.md).

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` cancelled / deferred

---

## Developer tooling

- [x] **Create Remotion demo video workspace.** Done 2026-06-05. `video/` contains the Remotion source for a 54s vertical Get Uncooked demo; rendered output lives in ignored `video/out/`.
- [x] **Add project-local `create-video` Codex skill.** Done 2026-06-05. Skill lives in `.codex/skills/create-video/` and documents safe use of Remotion's `npx create-video@latest` generator from this repo.

---

## P0 — v1 Build Order

> The 8-step path to a v1 that meets [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share). Each step is a vertical slice — finish it end-to-end before moving on.
>
> **D-019 positioning override (2026-06-03):** visible UI copy should say **Resume Score**, **AI Insights**, and **AI In-Depth Review**, not "resume roast," "Cooked Score," or "red flags." The main product focus is interview prep; score/share surfaces should be professional diagnostic reports without cooked/meme images. See [`ui-overhaul-plan.md`](./ui-overhaul-plan.md).
>
> **Constraints baked in:**
> - Zero ongoing API cost — [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback)
> - LLM routing: Gemini (analyze + questions), Groq (evaluate + feedback), cross-vendor failover — [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover)
> - Infra: FastAPI + Railway Postgres + R2 + Clerk + PostHog — [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog)
> - All schema changes via Alembic — [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer)

### Step 0 — Pre-work (do once, before step 1)

> **Already done as docs work:** `AGENTS.md` at repo root + `.cursor/rules/*.mdc` (v1-guardrails, v1-skip-list, frontend, backend). Cursor will auto-load these on every prompt.

- [x] **Move existing Next.js into `frontend/`.** Done 2026-05-12. `npm install` + `npm run lint` (clean) + `npm run dev` (Compiled in 2.3s, GET / 200) all verified from the new location. Locked by [D-013](./decisions.md#d-013-monorepo-with-frontend--backend-subfolders).
- [x] **Scaffold `backend/`.** Done 2026-05-12. Full tree: `app/main.py` with FastAPI + CORS + APScheduler lifespan, `app/core/{config,scheduler,security,storage}.py`, async SQLAlchemy `db/session.py`, models for all five tables (`users`, `resumes`, `analyses`, `questions`, `practice_sessions`), Alembic configured against `Settings.database_url`, LLM router with task-based routing scaffolded (raises `NotImplementedError` until Step 2), `pymupdf` parser with the 4000-word cap already wired for pasted text, retention sweep stub registered as a daily APScheduler job, route stubs returning 501 with pointers to which build-order step lights each one up.
- [ ] **Sign up for free tiers** (user action — see [`plans/next-steps.md`](./next-steps.md)): Google AI Studio, Groq Cloud, Render, Railway, Cloudflare R2, Clerk, PostHog. Save creds in a local password manager.
- [ ] **Lock score-card visual design.** Figma sketch or quick component scratch. Layout, content, and aspect ratio for screenshot/OG must be decided. Per [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share) the *design* leads, even if implementation comes at step 3.
- [ ] **Deploy the scaffold** (user action — wait until DB is ready): Vercel project Root Directory → `frontend`, Render project Root Directory → `backend`.

### Step 1 — PDF extraction + Postgres storage

- [ ] Backend: `backend/app/services/resume/parser.py` using `pymupdf`. Strips PII-light text, enforces the **4000-word cap** before storage.
- [ ] Backend: `users` and `resumes` tables via Alembic migration. **Include the `raw_text_deleted_at` column from day one** ([D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup)). See [database-schema.md](./database-schema.md).
- [ ] Backend: R2 client in `core/storage.py`; PDF flow = Frontend → FastAPI → R2 (store) → pymupdf (extract) → Postgres (`resumes.raw_text`).
- [ ] Backend: `POST /api/v1/resume/upload` route accepting multipart PDF **or** pasted text. Returns `resume_id`.
- [ ] Backend: **APScheduler retention job**. `services/resume/retention.py` runs daily, sweeps `resumes` where `created_at < now() - 24h AND raw_text_deleted_at IS NULL`, nulls `raw_text`, deletes the R2 object, stamps `raw_text_deleted_at`. Wired into `core/scheduler.py` and started in `app/main.py` on startup.
- [ ] Frontend: `frontend/src/lib/api.ts` — typed FastAPI client.
- [ ] Frontend: wire the upload affordance in `ResumeRoastDemo` to actually call the upload endpoint (still showing the regex result until step 2 lands).
- [ ] Frontend: ship the privacy copy — *"We delete your resume text within 24 hours. We keep only the analysis."* near the upload affordance.

### Step 2 — Gemini Flash analysis call → score + flags stored

- [ ] Backend: `app/services/llm/gemini.py` + `groq.py` + `router.py` (task-based router per [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover)).
- [ ] Backend: **prompt caching enabled** from day 1.
- [ ] Backend: `services/resume/analyzer.py` + `scorer.py` → produces `cooked_score`, `score_breakdown` (jsonb), `red_flags` (jsonb), `rewritten_bullets` (jsonb).
- [ ] Backend: `analyses` table via Alembic. Includes `prompt_version`, `status`, and a generated random `share_slug`.
- [ ] Backend: `POST /api/v1/resume/{id}/analyze` enqueues a `BackgroundTask`. SSE stream surfaces status. Cross-vendor failover handled inside the router; route returns `degraded: true` when both providers fail.
- [ ] Backend: `GET /api/v1/resume/{id}/score` + `GET /api/v1/resume/{id}/flags`.
- [ ] Frontend: subscribe to SSE; handle `pending → processing → done | failed | degraded`.
- [ ] Frontend: swap the regex output in `ResumeRoastDemo` for real backend data. **Drop the flashcards block** ([D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share)).

### Step 3 — Score card UI at `/share/[slug]` (the viral artifact)

- [ ] Frontend: `src/components/score/ScoreCard.tsx` — the screenshot-optimized component. Used by the demo result panel, the share page, and the OG image. Per [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
- [ ] Frontend: `src/app/share/[slug]/page.tsx` — clean chrome-free public render of the score card. Fetches from `GET /api/v1/share/{slug}`.
- [ ] Frontend: `src/app/share/[slug]/opengraph-image.tsx` — `next/og` social preview. Confirm unfurl on Twitter / LinkedIn / WhatsApp / Discord / iMessage.
- [ ] Frontend: "Share / screenshot" affordance in the demo result panel (copy link, download image, or both).
- [ ] Backend: `GET /api/v1/share/{slug}` — public, no auth, returns the minimum payload to render the score card. **Never exposes internal UUIDs.**

### Step 4 — Red flags display

- [ ] Frontend: red-flags section on the analysis page showing each flag pointing to its **source bullet** with a **suggested rewrite**. Per [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
- [ ] Test: each flag visibly references the user's exact wording, not generic advice.

### Step 5 — Question generation

- [ ] Backend: `services/questions/generator.py` → 10–15 questions per analysis with `category`, `source_bullet`, `difficulty`.
- [ ] Backend: `questions` table via Alembic.
- [ ] Backend: `GET /api/v1/resume/{id}/questions`.
- [ ] Frontend: questions list on the analysis page, grouped or filterable by category.
- [ ] Self-check: would a generic ChatGPT prompt without the resume produce this question? If yes, regenerate.

### Step 6 — Auth (Clerk) — only after the core loop works end-to-end

- [ ] Frontend: `@clerk/nextjs` middleware; `(auth)/login`, `(auth)/signup`, `(dashboard)/*` routes. `/share/[slug]` stays public.
- [ ] Backend: Clerk JWT verification middleware in `core/security.py`. Map Clerk user → `users` row on first request.
- [ ] Backend: associate `resumes.user_id` with the authenticated user.

### Step 7 — Rate limiting + input cap

- [ ] Backend: **DB-enforced 3-analyses/user/day** on the `users` row (`analyses_today`, `last_analysis_date`). Reject **before** the LLM call. Per [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
- [ ] Backend: `slowapi` per-IP limits on all endpoints as a second wall.
- [ ] Backend: 4000-word cap enforced in `parser.py` before storage (should already be in step 1 — confirm).
- [ ] Frontend: friendly rate-limit and "model warming" / `degraded: true` states.
- [ ] Frontend: honest demo copy ("powered by a free experimental model" per [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback)).

### Step 8 — PostHog

- [ ] Frontend: `posthog-js` initialised. Track: roast started, roast completed, score viewed, share clicked, screenshot button clicked, OG image rendered.
- [ ] Backend: optionally also instrument key server events.
- [ ] Confirm event volume stays inside the 1M/mo free tier.

### Stretch v1 (only if Steps 0–8 are done with time to spare)

- [ ] **Answer practice (text only, no rubric)** — `practice_sessions` table, `services/questions/evaluator.py`, `POST /api/v1/practice/answer`. Marked optional by [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).

## P1 — Trust + privacy

- [ ] **Privacy copy on the demo:** state where resume text goes and that it is not stored.
- [ ] **Strip PII heuristics** before sending to the LLM (email, phone, full name). Even a basic regex helps.
- [ ] **Rate limit** the API route (per IP) to avoid bill-shock.

## P2 — Virality (additional polish; the core share loop is now in P0 Step 1)

- [ ] **Tweet-ready share string** — when the user clicks "Share", pre-fill clipboard with something punchy + the share URL.
- [ ] **Track shares** without invasive analytics (server-side counter is fine).
- [ ] **Embed-friendly preview** — confirm the OG card unfurls correctly on Twitter, LinkedIn, WhatsApp, Discord, iMessage.

## P3 — Quality + polish

- [ ] Extract `DifficultyPill` to `src/components/ui/difficulty-pill.tsx` once a third file needs it (currently duplicated in `page.tsx` and `resume-roast-demo.tsx`).
- [ ] Audit landing page for unused lucide imports.
- [ ] Add `metadata` (OG/Twitter tags) in `app/layout.tsx`.
- [ ] Lighthouse pass: confirm dark theme contrast on every section.

## Deferred — do not start without approval

- [ ] Payment integration. (Pricing page is marketing-only until Phase 2 trigger.)
- [ ] Flashcards (cut from v1 by [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share)).
- [ ] Structured rubric scoring on answer feedback (v2).
- [ ] Voice mock interviews.
- [ ] Redis / Celery / worker queues (banned in v1 by [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog)).
- [ ] Anything from [Phase 3 in the roadmap](./roadmap.md#phase-3--later-bets).

---

## How to work from this list

1. Pick the next unchecked item in the **current step** of the build order. Do not skip ahead — each step depends on the previous one's vertical slice.
2. If blocked by an open question, surface it in `current-goals.md` and ask. Do not silently pick.
3. Make the change. Run `npm run dev` for frontend, `uvicorn` (or whatever's documented in [`setup.md`](./setup.md)) for backend.
4. Lint both: `npm run lint` (frontend) and whatever Python linter the backend ships with (`ruff` is the default candidate).
5. **Every schema change is an Alembic migration.** No manual `ALTER TABLE`. Per [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer).
6. Update this file (`[~]` while working, `[x]` when done).
7. Add a one-line entry in [`changelog.md`](./changelog.md).
8. If the change sets a precedent (new pattern, library choice, schema), add an ADR entry in [`decisions.md`](./decisions.md).
