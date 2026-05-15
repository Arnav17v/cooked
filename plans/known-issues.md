# Known Issues, Risks, and Gaps

Living list. Add new entries as discovered. Mark resolved items with `[resolved YYYY-MM-DD]` and move them to `changelog.md` if substantive.

## Code-level

- **Backend does not exist yet.** All of v1 is currently a Next.js frontend with regex heuristics. Scaffolding the FastAPI service is Step 0 in [tasks.md](./tasks.md#step-0--pre-work-do-once-before-step-1).
- **Frontend lives at repo root, not `frontend/`.** [D-013](./decisions.md#d-013-monorepo-with-frontend--backend-subfolders) requires the move; the first action of Step 0 is relocating `src/` and all root configs into `frontend/`. The currently-running `npm run dev` will break the moment the move happens — stop it first, then move, then `cd frontend && npm install && npm run dev`. Update Vercel project's Root Directory to `frontend` before the next deploy.
- **`DifficultyPill` is duplicated** in `src/app/page.tsx` and `src/components/resume-roast-demo.tsx`. Extract to `src/components/ui/difficulty-pill.tsx` the next time a third file needs it. Tracked in [tasks.md → P3](./tasks.md#p3--quality--polish).
- **`ResumeRoastDemo` still renders flashcards in its output panel.** Flashcards are cut from v1 by [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share). The marketing demo currently overpromises. Cleanup happens at Step 2 of the build order.
- **No tests** anywhere. Not a Jest/Vitest project. Acceptable for now but flag before merging anything non-trivial.
- **`npm run build` runs with `--no-lint`.** That hides real issues. Worth flipping back on once the codebase stabilizes.
- **Heuristic demo can mislead.** `ResumeRoastDemo` uses regex to produce the score. A naive user might think the production app is also regex. Replace at Step 2.
- **Unused lucide imports** may accumulate in `page.tsx` as sections evolve. Run lint to catch.

## Product-level

- **Scope creep is the #1 killer.** v1 is locked at three features by [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share). Two previous "must-haves" (flashcards, structured rubric scoring) have already been demoted. Any new "this would be cool to add" needs an ADR.
- **The score card is the product.** If the score card is not screenshot-able and OG-renderable, v1 fails its only success metric. See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
- **Question genericness risk.** "Personalized interview questions" are the differentiator vs ChatGPT. If they read generic, v1 has no moat. Build a self-check: would this question make sense without the user's resume? If yes, regenerate.
- **AI accuracy is the moat and the risk.** Wrong feedback on technical questions kills trust fast. Need a narrow rubric and conservative scoring before broadening. See [D-005](./decisions.md#d-005-tone-calibration).
- **v1 quality ceiling is the free model's ceiling.** By design ([D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback)). Mitigation: narrow rubric, defensive prompt, honest demo copy ("powered by a free experimental model"). Real fix is v2.
- **Free-tier rate limits & outages.** Gemini 2.0 Flash AND Groq Llama 3.3 70B can both throttle or 5xx without warning. Mitigation per [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover): task-routing with cross-vendor failover + degraded-result fallback, plus DB-enforced daily cap + `slowapi` IP limits. Tracked in [tasks.md → Steps 2 + 7](./tasks.md#p0--v1-build-order).
- **Render free-tier cold starts.** First request after a ~15-min sleep adds ~30s. v1 mitigation is **honest UI copy only** ("warming the model") — no cron-pinger by [D-014](./decisions.md#d-014-skip-the-render-cron-pinger-in-v1). The cold-start loading state in the frontend is therefore load-bearing (mandatory at Step 7), not optional.
- **Two codebases to keep in sync.** Frontend and backend evolve together but ship independently. API contract drift is a real risk. Mitigation: keep the contract centralized in [infra.md → API contract](./infra.md#api-contract-v1) and `src/lib/api.ts` types.
- **Schema-change discipline.** v2/v3 will add columns and tables for years. Anything bypassing Alembic risks data corruption and untraceable drift. Locked by [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer).
- **Provider lock-in risk.** Easy to accidentally couple to a vendor SDK's quirks. Mitigation: all model calls go through `src/lib/llm.ts` so v2 is a one-file swap. Tracked in P0.
- **Free-tier ToS / data policies.** Free LLM tiers commonly train on inputs by default. Resume text is PII-adjacent. **Action item:** before first real call, verify Google AI Studio's and Groq's free-tier data-usage terms and add a PII-strip step before sending (regex pass over name / email / phone / address).
- **Prompt-caching is mandatory from day 1.** Long system prompts repeated per request will burn free quota fast. Both Google and Anthropic support native prompt caching — designed in upfront per [D-009](./decisions.md#d-009-llm-provider-choice-gemini-20-flash-primary--groq-llama-fallback). Retrofitting later wastes early users' quota and risks getting throttled before traction.
- **Multi-provider config drift.** Two free providers means two key rotations, two billing dashboards (in case quotas slip into paid), two SDK upgrade cadences. Single point of truth is `src/lib/llm.ts`.
- **Tone can backfire.** "Savage" + actionable is the target. Pure mockery alienates juniors. Watch user reactions; A/B if needed.
- **Episodic retention.** Job hunting is bursty. Users land jobs and leave. Build the loop to expect this; do not depend on weekly DAU.
- **PII handling.** Users will paste names, emails, phones. Strip before sending to providers. Tracked in [tasks.md → P1](./tasks.md#p1--trust--privacy).
- **Cost runaway.** Solo dev + LLM API + no rate limiting = bill-shock risk. v1 is free-tier so the *amount* is capped, but rate limiting is still required to avoid being kicked off the free tier entirely. Tracked in P0/P1.

## Brand / market

- **Competitive overlap.** Interviewing.io, Pramp, Exponent, Final Round AI, Yoodli, InterviewPal, Big Interview, Teal HQ, Careerflow. "Cooked" framing is the differentiator; the product underneath must still be good.
- **Pricing assumption (₹99–₹299) is unvalidated.** First payment integration will be the real test.
- **Community cold-start trap.** Already mitigated via [D-003](./decisions.md#d-003-defer-community). Do not forget.

## Open questions (assumptions to confirm with the user)

1. Voice mock interviews timeline. Default: deferred indefinitely until text v1 is solid.
2. Light theme: confirmed deferred / abandoned?
3. Geography for the paid roast report — INR pricing implies India-first. Stripe vs Razorpay vs Lemon Squeezy?

> **Resolved:**
> - PDF parsing in v1 — **yes**, via `pymupdf` on the backend. See [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog) (supersedes the old paste-only D-002).
> - Analytics — **PostHog**, added in step 8.
> - Hosting — Vercel (`frontend/`) + Render (`backend/`) + Railway (DB) + R2 (blobs). See [infra.md](./infra.md).
> - **Monorepo with `frontend/` + `backend/` subfolders.** See [D-013](./decisions.md#d-013-monorepo-with-frontend--backend-subfolders).
> - **Render cron-pinger** — skip in v1; cold-start hint copy on the frontend is the mitigation. See [D-014](./decisions.md#d-014-skip-the-render-cron-pinger-in-v1).
> - **Resume text retention** — 24h, APScheduler sweep, analysis kept forever. See [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup).

## Anti-features (do not ship in v1)

The canonical "do not build" list lives in [`/.cursor/rules/v1-skip-list.mdc`](../.cursor/rules/v1-skip-list.mdc) and is auto-loaded by Cursor on every prompt. Keep them in sync.

**Product anti-features:**

- Public resume rankings.
- Recruiter resale of resumes.
- Profile scraping.
- Any subscription tier in Phase 1.
- Any community surface in Phase 1.
- **Flashcards in Phase 1.** Demoted by [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share). May return in v2.
- **Structured rubric scoring on answer feedback in Phase 1.** Plain prose only. See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
- **Generic interview questions.** If a question would make sense without the user's resume, it does not ship.

**Engineering / surface anti-features:**

- Traditional SEO surfaces (sitemap, robots.txt, blog, landing-page content farm). No pages exist to rank in v1.
- Accessibility / WCAG audit pass. v2.
- i18n / multi-language. v2+.
- PWA, service workers, offline mode.
- Heavy analytics — PostHog covers `pageview + analysis_started + analysis_completed + share_clicked`, no more.
- Sentry / error-tracking SaaS — use Render's stdout logs in v1.
- Tests (unit / integration / e2e), Storybook, monorepo workspace tooling.
- Auth flows beyond Clerk's defaults — no magic links, no SSO providers, no roles.
- Payment / Stripe / Razorpay. Pricing page is marketing-only until v2.
- Redis / Celery / any worker queue. Banned by [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
- A second database, a search index, a vector store.
- Any LLM model that is not on **Google AI Studio** (Gemini Flash / Gemma via `GEMINI_MODEL`) or **Groq Llama 3.3 70B**. Both free tier only.
- Light theme.
