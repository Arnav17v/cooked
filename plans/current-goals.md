# Current Goals

## North star

**Does someone screenshot the Cooked Score and share it?**

If yes, v1 worked. Everything else is secondary. **Design the score card first, features second.** See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).

## Priority override

After the core backend API works, **build the `/share/[slug]` score-card UI before anything else.** The default temptation is to build auth and dashboards next — resist it. The viral artifact ships before any session-bound surface. This is locked in [`/.cursor/rules/v1-guardrails.mdc`](../.cursor/rules/v1-guardrails.mdc) and in the [build order](./tasks.md#p0--v1-build-order) (score card is Step 3, auth is Step 6).

## Current phase

**Phase 0 — Marketing surface + interactive fake demo.** *(Done.)*

- Landing page communicates the brand, hook, and phased roadmap.
- `ResumeRoastDemo` runs local regex heuristics that look real enough to demonstrate the loop.
- LeetCode-inspired dark theme applied across the app.

## Next phase

**Phase 1 (v1) — Real MVP loop on a completely free LLM.** Three must-have features, one nice-to-have, screenshot-able score card as the headliner. **No paid model spend in v1** — see [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback). **Scope locked** — see [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).

### Must-have (v1 ships when all three work)

1. **Resume Upload + Cooked Score**
   - Paste or upload resume, pick a target role, get a score with a brutal breakdown.
   - The **score card must be designed as a screenshot-able artifact** — clean, branded, looks good on Twitter/LinkedIn/Reddit. This is the viral mechanic.
   - Ship an OG / share image so links unfurl with the score baked in.
2. **Resume Red Flag Detection**
   - Specific, actionable callouts on the user's exact bullets.
   - Each red flag must include a **suggested rewrite**, not just "add metrics."
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

> **v1 is intentionally lower quality than the theoretical ceiling.** The goal is *can users get a score worth screenshotting*, not *is the LLM best-in-class*. Quality upgrade happens in v2 after user feedback.

### Definition of done for Phase 1 (v1)

> Implementation is sequenced by the 8-step build order in [`tasks.md`](./tasks.md#p0--v1-build-order).

**Score card / virality (the headline — Step 3)**

- [ ] **Score card is screenshot-optimized**: clean composition that looks good as a phone screenshot, branded with the Cooked logo + score + heat label, no surrounding UI chrome bleeding into the shot.
- [ ] **`/share/[slug]` page** renders the card cleanly with no nav/footer. Slug, not UUID.
- [ ] **OG / share image** auto-generated via `next/og` at `app/share/[slug]/opengraph-image.tsx`.
- [ ] **"Share / screenshot" affordance** visible on the result panel (copy link, download image, or both).

**The three core features**

- [ ] User can paste resume text **or upload a PDF** + select role → click Run → see a real LLM-generated roast within ~10s (excluding Render cold-start).
- [ ] Output includes: cooked score (0–100) + heat label, **3+ red flags each pointing to the user's exact bullet and including a suggested rewrite**, and **10–15 personalized interview questions** drawn directly from their bullets/projects (not generic).
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

- **The one metric**: at least one user organically screenshots their Cooked Score and shares it where we can see it (Twitter / LinkedIn / Reddit / WhatsApp screenshot circulating, etc.). See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
- ~100 unique users actually run a roast.
- At least one organic share that brings in non-friend traffic.
- Some concrete user feedback telling us **where the free model is hurting us** (which red flags felt wrong, which questions felt generic, etc.).
- A first paying user for a "full roast" report (also Phase 2 trigger).

## Phase 2 (v2 — queued, not started)

v2 is **both** a feature upgrade and a model upgrade:

- **Model upgrade**: move off the free v1 LLM to a paid / higher-quality model on the dimensions the user feedback flagged. See [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback).
- **Full Roast Report** — one-time paid (₹99–₹299), deeper analysis, rewritten bullets, danger zones, cram plan. See [D-004](./decisions.md#d-004-monetization).
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
