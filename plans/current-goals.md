# Current Goals

## North star

**Does the user start useful interview prep from their resume?**

As of [D-019](./decisions.md#d-019-interview-prep-first-resume-score-terminology-diagnostic-score-report), the public product story is **interview prep first**. Resume scoring is the diagnostic entry point: users upload a resume, get a multi-dimensional **Resume Score**, read **AI Insights** and an **AI In-Depth Review**, then continue into questions, quizzes, notes, and a prep plan.

The share card still matters, but it is no longer the only success signal and it should no longer be meme-led.

## Priority override

Build the resume-powered prep loop in this order: **Resume Score → AI Insights → AI In-Depth Review → interview questions/practice → prep plan continuation**. The authenticated score page should show the resume preview beside the diagnostic report on desktop; public share pages must not expose private resume previews.

## Current phase

**Phase 0 — Marketing surface + interactive fake demo.** *(Done.)*

- Landing page communicates the brand, hook, and phased roadmap.
- `ResumeRoastDemo` runs local regex heuristics that look real enough to demonstrate the loop.
- LeetCode-inspired dark theme applied across the app.

## Next phase

**Phase 1 (v1) — Real MVP loop on a completely free LLM.** Interview prep is the headliner; Resume Score is the diagnostic entry point. **No paid model spend in v1** — see [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback). **Product positioning updated** — see [D-019](./decisions.md#d-019-interview-prep-first-resume-score-terminology-diagnostic-score-report).

### Must-have (v1 ships when all three work)

1. **Resume Upload + Resume Score**
   - Paste or upload resume, pick a target role, get a multi-dimensional score.
   - Required dimensions: ATS `0-20`, Content `0-40`, Writing `0-10`, Job Match `0-25` (Ready removed; sum max 95, shown `/100`).
   - Stop using cooked/meme images on score cards.
2. **AI Insights + In-Depth Review**
   - Specific, actionable callouts on the user's exact bullets.
   - Each insight must include a **suggested rewrite or prep action**, not just "add metrics."
   - Add a longer **AI In-Depth Review** narrative for strengths, risks, interview story gaps, and recommended prep focus.
3. **Personalized Interview Questions**
   - 10–15 questions pulled **directly from the user's bullets/projects**.
   - Test: would a generic ChatGPT prompt produce this? If yes, the question is too generic — regenerate.

### Nice-to-have (only if <1 day of work)

- **Answer Practice (text only)** — user types an answer to one generated question, gets plain-prose feedback ("here's what was good, here's what was weak"). **No rubric scoring in v1** — that's a v2 feature ([D-009 → v2 considerations](./decisions.md#d-009-llm-provider-choice-gemini-20-flash-primary--groq-llama-fallback)).

### Cut from v1 (do not build)

- **Flashcards** — previously in v1, demoted. Remove from the demo component output too. See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
- Structured rubric scoring on answer feedback.
- Voice mock interviews.
- Community/forum, ranked queues, credits, seminars.
- JD targeting.
- "Can AI Replace Me?" report.

> **v1 is intentionally lower quality than the theoretical ceiling.** The goal is whether users can start useful interview prep from the resume-powered score/review loop. Quality upgrade happens in v2 after user feedback.

### Definition of done for Phase 1 (v1)

> Implementation is sequenced by the 8-step build order in [`tasks.md`](./tasks.md#p0--v1-build-order).

**Resume Score report / share preview**

- [ ] Score report shows multi-dimensional scoring, not just one number.
- [ ] Authenticated score page shows resume PDF preview beside the report on desktop, with text-preview fallback for pasted resumes.
- [ ] **`/share/[slug]` page** renders a clean public score/review preview with no private resume preview. Slug, not UUID.
- [ ] **OG / share image** auto-generated via `next/og` at `app/share/[slug]/opengraph-image.tsx`.

**The three core features**

- [ ] User can paste resume text **or upload a PDF** + select role → click Run → see a real LLM-generated Resume Score within ~10s (excluding Render cold-start).
- [ ] Output includes: Resume Score dimensions, **3+ AI Insights each pointing to the user's exact bullet and including a suggested rewrite or prep action**, an AI In-Depth Review, and **10–15 personalized interview questions** drawn directly from their bullets/projects (not generic).
- [ ] No regressions in the existing landing page sections.
- [ ] Public `/share/[slug]` path is **unauthenticated**; the rest of the app may live behind Clerk after Step 6.
- [ ] Privacy copy reflects what actually happens to the resume text (sent to provider X via FastAPI, retention policy is X).

**Nice-to-have (only if cheap to ship)**

- [ ] One generated question can be answered in text and returns short prose feedback. **No rubric** in v1.

**Engineering / cost guardrails**

- [ ] **Zero ongoing API cost** — confirmed against Gemini's and Groq's free-tier pricing.
- [ ] **All LLM calls go through `backend/app/services/llm/router.py`** — only file allowed to import an LLM SDK. v2 model swap is a one-file change. See [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
- [ ] **Task-routed primary → cross-vendor failover → degraded fallback** working, with `degraded: true` surfaced honestly in the UI.
- [ ] **Prompt caching** enabled on system prompts — see [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover).
- [ ] **DB-enforced 3-analyses/user/day** rate limit + `slowapi` per-IP wall.
- [ ] **4000-word input cap** enforced in `parser.py` before storage.
- [ ] **All schema changes via Alembic** — no manual `ALTER TABLE`. See [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer).
- [ ] **Honest copy** on the demo ("powered by a free experimental model") — do not oversell quality in v1.

## What we are explicitly **not** doing in Phase 1

- Community / forum / ranked queues / credits / seminars. See [D-003](./decisions.md#d-003-defer-community).
- Multiple monetization paths. Pricing page stays as marketing; payment integration waits. See [D-004](./decisions.md#d-004-monetization).
- Voice mock interviews. Text-first.
- Redis / Celery / worker queues. Banned in v1 by [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).

## Success signal before moving past Phase 1 (v1 → v2 trigger)

- **Primary signal**: users continue from Resume Score / AI Insights into practice questions or a prep plan. See [D-019](./decisions.md#d-019-interview-prep-first-resume-score-terminology-diagnostic-score-report).
- ~100 unique users complete a score/prep intake.
- At least one organic share of the score/review preview that brings in non-friend traffic.
- Some concrete user feedback telling us **where the free model is hurting us** (which AI Insights felt wrong, which questions felt generic, etc.).
- A first paying user for a deeper review/prep upgrade (also Phase 2 trigger).

## Phase 2 (v2 — queued, not started)

v2 is **both** a feature upgrade and a model upgrade:

- **Model upgrade**: move off the free v1 LLM to a paid / higher-quality model on the dimensions the user feedback flagged. See [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback).
- **Full In-Depth Review / prep upgrade** — one-time paid candidate (₹99–₹299), deeper analysis, rewritten bullets, danger zones, cram plan. See [D-004](./decisions.md#d-004-monetization) and [D-019](./decisions.md#d-019-interview-prep-first-resume-score-terminology-diagnostic-score-report).
- **Can AI Replace Me?** report — shareable LinkedIn bait that separates commodity skills from durable signals.

See [`roadmap.md`](./roadmap.md) for the full phased view including later bets.

## Open questions for the user (blocking Phase 1 kickoff)

*(none — all resolved as of 2026-05-12. Phase 1 is unblocked; **Step 0 of [tasks.md](./tasks.md#step-0--pre-work-do-once-before-step-1) is the next action**.)*

> **Resolved:**
> - Provider stack — task-routed: Gemini for analyze + questions, Groq for evaluate + feedback, cross-vendor failover. See [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover).
> - Infra — FastAPI on Render + Railway Postgres + R2 + Clerk + PostHog. See [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog) + [infra.md](./infra.md).
> - **Monorepo with `frontend/` + `backend/` subfolders.** See [D-013](./decisions.md#d-013-monorepo-with-frontend--backend-subfolders).
> - **Render cron-pinger** — skip in v1. See [D-014](./decisions.md#d-014-skip-the-render-cron-pinger-in-v1).
> - **Resume text retention** — optional 24h-style sweep when `RAW_TEXT_RETENTION_ENABLED=true`; default keep text. See [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup) + [D-017](./decisions.md#d-017-raw-resume-text-retention-is-opt-in-default-keep).
> - PDF parsing in v1 — **yes**, via `pymupdf` on the backend. ([D-002](./decisions.md#d-002-paste-before-pdf-superseded-by-d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog) superseded.)
> - OG / share card in v1 — **yes, required**. See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
> - Flashcards in v1 — **no**, cut. See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
> - Hosting — Vercel (`frontend/`) + Render (`backend/`) + Railway. See [infra.md](./infra.md).
