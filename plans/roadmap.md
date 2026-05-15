# Roadmap

Phased scope, derived from the agent critique sessions. The principle: **launch the smallest possible viral loop first**, then add monetization, then add community features only after retention is proven.

The landing page (`src/app/page.tsx`) already renders this roadmap as a problem-list table. Keep that section in sync with this file.

## Phase 1 — v1 — Build first (MVP, free stack)

> Ship these three. Nothing else. See [`current-goals.md`](./current-goals.md) and [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
>
> **Cost constraint:** v1 runs on a **completely free LLM + free infra**. No paid API spend. Effective cost ₹0 until free tiers are outgrown. See [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback) + [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog).
>
> **Infra**: Next.js on Vercel + FastAPI on Render + Postgres on Railway + R2 + Clerk + PostHog. See [infra.md](./infra.md).
>
> **The one metric:** does someone screenshot the Cooked Score and share it? Design the score card first.

### Must-have

| # | Feature | Difficulty | Why now |
| --- | --- | --- | --- |
| 1 | **Resume Upload + Cooked Score (screenshot-able)** | Easy | The hook. Score card is the viral artifact — design it first, features second. |
| 2 | **Resume Red Flag Detection (with rewrites)** | Easy | Points to the exact bullet. Each flag includes a suggested rewrite. |
| 3 | **Personalized Interview Questions** (10–15, from actual bullets) | Easy | The only feature that meaningfully beats "just prompt ChatGPT". |

### Nice-to-have (only if <1 day of work)

| # | Feature | Difficulty | Notes |
| --- | --- | --- | --- |
| — | **Answer Practice (text only)** | Easy | Plain-prose feedback only. **No rubric scoring in v1**. |

### Cut from v1

- **Flashcards** — demoted from "Build first." Nice-to-have, not core. May return in v2.
- **Structured rubric scoring** on answer feedback — v2.
- Voice mocks, community, ranked queues, credits, seminars, JD targeting, "Can AI Replace Me?" — all v2 or later.

## Phase 2 — v2 — Monetize + quality upgrade

> Trigger: Phase 1 has ~100 active users, at least one organic share loop, and concrete user feedback on where the free model fell short.

v2 ships **two upgrades in parallel**:

- **Model upgrade** — move off the v1 free model to a paid / higher-quality model on the dimensions feedback flagged. See [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback).
- **New paid features**:

| # | Feature | Difficulty | Why |
| --- | --- | --- | --- |
| 4 | **Full Roast Report** (one-time paid) | Medium | Validated monetization model. ₹99–₹299. No subscription friction. |
| 5 | **Can AI Replace Me?** | Medium | Shareable LinkedIn bait. Marketing + product in one. |

## Phase 3 — Later bets

> Trigger: ~1,000 active users for community surfaces. Most of these have **cold-start risk** and should not be built early.

| # | Feature | Difficulty | Risk |
| --- | --- | --- | --- |
| 6 | Ranked Interview Queues | Hard | Needs critical mass, anti-cheat, accurate scoring. |
| 7 | Rate My Resume Forum | Hard | Cold-start. Quality moderation needed. |
| 8 | Interview Story Credits | Hard | Verification, fraud, legal. |
| 9 | Limited-Seat Expert Seminars | Hard | Scales poorly; depends on expert supply + audience trust. |

## Adjacent ideas (not committed)

These came up in conversation and may eventually flow into Phase 2/3. Do not build without explicit user approval.

- Job Description Targeting (premium tier)
- Interview Cram Mode (high-intensity prep before an interview)
- Project Deep-Dive Mode (one project, technical follow-ups)
- Mock Interview Practice with follow-ups (voice optional)
- Anonymized benchmarks ("your resume is stronger than 65% of junior frontend applicants")
- Hybrid model: optional human expert reviews/mocks as upsell

## What we will not build

- Multiple parallel monetization models. Pick one (paid roast report) and validate.
- Recruiter-side SaaS / ATS scanning as a primary surface.
- LeetCode coding queues — different product, crowded market.
- A community surface before there are enough users to make it feel alive.

## Cross-references

- Scope rationale: [`decisions.md`](./decisions.md)
- Active tasks: [`tasks.md`](./tasks.md)
- Risks per feature: [`known-issues.md`](./known-issues.md)
