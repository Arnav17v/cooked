# Agent Instructions

Rules of engagement for AI agents (and humans) working on this repo. Read this **before** making changes.

> **Auto-loaded by Cursor on every prompt:**
> - [`/AGENTS.md`](../AGENTS.md) — repo-root index for any agent.
> - [`/.cursor/rules/v1-guardrails.mdc`](../.cursor/rules/v1-guardrails.mdc) — always-apply scope + invariants.
> - [`/.cursor/rules/v1-skip-list.mdc`](../.cursor/rules/v1-skip-list.mdc) — always-apply "do not build".
> - [`/.cursor/rules/frontend.mdc`](../.cursor/rules/frontend.mdc) — `frontend/**` only.
> - [`/.cursor/rules/backend.mdc`](../.cursor/rules/backend.mdc) — `backend/**` only.
>
> These are the *short* form. This folder (`plans/`) is the *long* form. Keep them consistent — if you change a rule here, update the matching `.mdc` file (and vice versa).

## 1. Read first, write second

Before touching code, read in this order:

1. [`project-overview.md`](./project-overview.md) — what we are building and why.
2. [`current-goals.md`](./current-goals.md) — what phase we are in and what is in scope.
3. [`tasks.md`](./tasks.md) — the 8-step build order. Pick from here if no explicit user instruction.
4. [`decisions.md`](./decisions.md) — has this been decided already? If yes, do not re-litigate.
5. [`architecture.md`](./architecture.md) — two-service layout, file boundaries, API surface.
6. [`infra.md`](./infra.md) — for anything touching backend, env vars, deploy, cost.
7. [`database-schema.md`](./database-schema.md) — for anything touching the DB.
8. [`design-system.md`](./design-system.md) — if anything visual is involved.
9. [`known-issues.md`](./known-issues.md) — traps and assumptions to check.

## 2. Stay in scope

We are in **Phase 1 / v1** (see [`current-goals.md`](./current-goals.md)). Anything outside of the three Build-first features needs explicit user approval before being implemented.

**Hard no without approval:**

- Payment integration.
- Community, forum, ranked queues, credits, seminars.
- Subscription tiers (one-time only for first monetization — see [D-004](./decisions.md#d-004-monetization)).
- Adding a light theme.
- **Calling any paid LLM model.** v1 is free-only. Google API (`GEMINI_MODEL`: Gemma or Gemini Flash) + Groq Llama 3.3 70B. GPT-4o, Claude Sonnet, GPT-4o Mini, Claude Haiku 3.5, etc. are **v2 candidates only** — do not wire them up. See [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback) + [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover).
- **Importing an LLM SDK outside `backend/app/services/llm/`.** The router is the single allowed boundary. The Next.js frontend **never** talks to an LLM directly — it talks to FastAPI only. See [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
- **Shipping an LLM call without prompt caching.** Mandatory from day 1 per [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover).
- **Adding features beyond the three v1 must-haves.** v1 = Cooked Score + Red Flags + Personalized Questions. Nothing else. Specifically banned in v1: flashcards, structured rubric scoring, voice input, JD targeting, "Can AI Replace Me?", community, ranked queues, credits, seminars. See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
- **Skipping the score card.** The score card is the v1 viral artifact and its design must be locked at Step 0 of the build order. Implementation at Step 3. If you find yourself building feature UI before there is a clean, screenshot-able, OG-renderable score card design, stop. See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
- **Running `ALTER TABLE` manually in production.** Every schema change goes through Alembic. No exceptions. See [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer).
- **Introducing Redis, Celery, or any worker queue in v1.** `BackgroundTasks` + SSE is the only async we use. See [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
- **Exposing internal UUIDs in public URLs.** Share routes use `share_slug` only. See [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
- **Replacing Postgres with Supabase or any DB that pauses on inactivity.** Railway is the v1 choice. See [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).

## 3. Respect the design system

- Use `lc.*` Tailwind tokens. Do not introduce a new brand color.
- Primary CTA = black text on `lc-orange`. Never white-on-orange.
- Use mono font for code-flavored affordances (filenames, scores, `// section` labels, question numbers).
- Use difficulty colors **semantically**: green = safe/strength, yellow = warning, red = risk/red-flag. Do not use them as random decoration.
- See anti-patterns in [`design-system.md`](./design-system.md#anti-patterns).

## 4. Keep the docs alive

After any non-trivial change:

- Tick the task in [`tasks.md`](./tasks.md) or add a new one.
- Add a one-liner to [`changelog.md`](./changelog.md).
- If the change establishes a new pattern, library, schema, or product rule, add an ADR entry in [`decisions.md`](./decisions.md).
- If you discover a gap or risk, add it to [`known-issues.md`](./known-issues.md).

Failing to update docs is the single biggest way this knowledge base decays. Treat docs as part of the diff.

## 5. Tone of feedback the AI generates

The product itself is "savage + actionable". Internal copy must follow [D-005](./decisions.md#d-005-tone-calibration):

- Mock the bullet, not the human.
- Every red flag must come with a fix or a question that surfaces the gap.
- No condescending phrasing about juniors or career switchers.

## 6. UX invariants — every async surface

Any component that calls an API must ship **all five** of these states. Happy-path-only is a bug:

1. Loading
2. Error
3. Empty
4. Rate-limited (3 analyses/day cap hit)
5. `degraded: true` (LLM fallback used — show an honest hint, not silence)

Additional invariants:

- **Mobile-first at 375px.** The score card especially — that's the screenshot context.
- **Stream progress via SSE** for any operation > 2s (analysis, question generation). Show stages (*extracting resume… analyzing… generating questions…*), not a blank spinner.
- **Server Components by default** in Next.js. Add `"use client"` only when state/effects/events/browser APIs are needed.

## 7. Verification before declaring done

- `cd frontend && npm run dev` compiles cleanly (post-Step 0).
- `cd backend && uvicorn app.main:app --reload` runs cleanly.
- `npm run lint` passes (or only has pre-existing warnings). Run `ruff check .` on backend changes.
- Visual sanity check at `http://localhost:<port>` for any UI change.
- For UI changes: spot-check both desktop and a **375px mobile width**. **For the score card specifically, spot-check it as a phone screenshot AND as an unfurled OG card on at least Twitter and LinkedIn.**
- For backend changes: verify `curl` round-trips against the relevant `/api/v1/...` endpoint.
- For schema changes: confirm Alembic migration applies cleanly and is reversible.

## 8. When unsure — ask, don't assume

If a decision is missing from [`decisions.md`](./decisions.md), surface the question in your reply instead of picking silently. Add it to the relevant `## Open questions` section.

## 9. File-creation hygiene

- Prefer editing existing files over creating new ones.
- Do not create new markdown files outside `/plans` without reason.
- Do not create documentation files (README/`*.md`) inside `frontend/src/` or `backend/app/`. Code is documentation; `/plans` is documentation.

## 10. Commits and PRs

- No commits unless the user explicitly asks.
- Never push to remote, never force-push, never rewrite history without explicit instruction.

## 11. Quick map for common tasks

> Paths shown as post-Step-0. Pre-Step-0, frontend paths are at the repo root (`src/...`) instead of `frontend/src/...`.

| Want to… | Touch | Cross-check |
| --- | --- | --- |
| Add a section to the landing page | `frontend/src/app/page.tsx` | [`design-system.md`](./design-system.md) |
| Change the interactive demo | `frontend/src/components/resume-roast-demo.tsx` | [`current-goals.md`](./current-goals.md) |
| Tweak colors / tokens | `frontend/tailwind.config.ts` + `frontend/src/app/globals.css` | [`design-system.md`](./design-system.md) |
| Build the score card / share artifact | `frontend/src/components/score/ScoreCard.tsx`, `frontend/src/app/share/[slug]/page.tsx`, `frontend/src/app/share/[slug]/opengraph-image.tsx` | [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share), [`tasks.md → Step 3`](./tasks.md#p0--v1-build-order) |
| Add or modify an LLM call | `backend/app/services/llm/` (only) | [`architecture.md → LLM provider strategy`](./architecture.md#llm-provider-strategy), [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover) |
| Add or modify a backend route | `backend/app/api/v1/routes/` | [`infra.md → API contract`](./infra.md#api-contract-v1) |
| Add or change a DB column/table | Generate an Alembic migration in `backend/app/db/migrations/` | [`database-schema.md`](./database-schema.md), [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer) |
| Add / change a scheduled job | `backend/app/core/scheduler.py` + service file | [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup), [`infra.md → Data retention`](./infra.md#data-retention) |
| Change scope | [`current-goals.md`](./current-goals.md) + [`roadmap.md`](./roadmap.md) | [`decisions.md`](./decisions.md) (add ADR if it's a pivot) |
