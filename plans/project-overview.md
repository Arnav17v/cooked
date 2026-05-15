# Project Overview

## Product

**Am I Cooked?** — an AI-powered resume roast and interview-prep web app with a savage, viral wrapper around a serious career-readiness tool.

The hook: a user pastes/uploads their resume, picks a target role, and gets a brutally honest **Cooked Score** (designed to be screenshot-able), red flags with suggested rewrites on their exact bullets, and 10–15 personalized interview questions pulled directly from their resume.

## Target user

- Job seekers (heavy bias toward tech: Frontend, Backend, Full Stack, DevOps, AI/ML, Data) preparing for interviews.
- Users who already share "roast my resume" content on Reddit / Twitter / LinkedIn.
- Secondary: career switchers, juniors anxious about AI replacing them.

## Value proposition

1. **Specific feedback, not generic.** Tells you exactly which bullets an interviewer will challenge instead of suggesting "use action verbs."
2. **Resume → personalized interview questions pipeline.** 10–15 questions drawn from the user's actual bullets/projects. This is the core differentiator vs. ChatGPT prompting or generic LeetCode/behavioral question banks.
3. **A viral, self-deprecating brand** ("Am I Cooked?", "Cooked Score", red flags) with a **screenshot-optimized score card** as the share artifact. The score card *is* the marketing. See [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share).
4. **Privacy-first** — redacted sharing, consent, delete controls. No public resume rankings, no recruiter resale.

## Positioning (one-liner)

> The brutally honest AI career coach that actually prepares you for the exact interview.

## Tone

- Savage but useful. Humor is the wrapper; the underlying feedback must be actionable and accurate.
- Calibrate carefully: do **not** become demoralizing. See [decisions.md → D-005](./decisions.md#d-005-tone-calibration).

## Current state (as of this revision)

- Single-page marketing/landing site built with Next.js 15 + Tailwind, styled with a LeetCode-inspired dark theme.
- Interactive `ResumeRoastDemo` component that runs **local regex heuristics** (not real AI) to produce a fake-but-illustrative cooked score and red-flag preview.
- No backend, no auth, no persistence, no real LLM integration yet.
- Roadmap section on the landing page already communicates the phased scope (Build first / Monetize next / Later bets).

## Version strategy

- **v1** ships the MVP loop on a **completely free stack** — task-routed Gemini 2.0 Flash + Groq Llama 3.3 70B (cross-vendor failover), FastAPI on Render, Postgres on Railway, R2 for PDFs, Clerk for auth, PostHog for analytics. No paid API spend, effective cost ₹0 until traffic outgrows free tiers. Lower quality is accepted; the goal is loop validation, not best-in-class output.
- **v2** is triggered by real user feedback once v1 has ~100 users and at least one organic share loop. v2 = quality upgrade (likely Claude Haiku 3.5 for answer scoring, GPT-4o Mini as generalist upgrade) + first paid feature (Full Roast Report).

See [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback), [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover), [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog), and [`current-goals.md`](./current-goals.md).

## Competitive landscape (acknowledged, not yet differentiated against)

- Interviewing.io, Pramp, Exponent
- Final Round AI, Yoodli, InterviewPal, Big Interview, Interviews by AI
- Teal HQ, Careerflow (resume side)
- LeetCode-style platforms (skill drilling)

The framing ("Am I Cooked?") is fresh. The serious underneath is **table stakes**, so quality of the AI output and accuracy of feedback are the only durable moats.

## Non-goals (explicit)

- Not a full ATS / recruiter SaaS.
- Not a generic LeetCode clone — coding queues are a **later bet**, not the MVP.
- Not building a community before having ~1,000 active users. See [D-003](./decisions.md#d-003-defer-community).
- Not chasing multiple monetization models at once. See [D-004](./decisions.md#d-004-monetization).
