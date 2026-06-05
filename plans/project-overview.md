# Project Overview

## Product

**Get Uncooked** ([getuncooked.pro](https://getuncooked.pro)) — an AI-powered interview-prep web app that starts from a user's resume, scores it across interview-relevant dimensions, and turns the gaps into targeted prep.

The hook: a user pastes/uploads their resume, picks a target role, and gets a multi-dimensional **Resume Score**, **AI Insights** with suggested rewrites or prep actions, an **AI In-Depth Review**, and 10–15 personalized interview questions pulled directly from their resume. See [D-019](./decisions.md#d-019-interview-prep-first-resume-score-terminology-diagnostic-score-report).

## Target user

- Job seekers (heavy bias toward tech: Frontend, Backend, Full Stack, DevOps, AI/ML, Data) preparing for interviews.
- Users who want resume-grounded interview prep instead of generic question banks.
- Secondary: career switchers, juniors anxious about AI replacing them.

## Value proposition

1. **Interview prep from the actual resume.** Tells users which bullets an interviewer will challenge and turns those gaps into practice.
2. **Multi-dimensional Resume Score.** ATS, Content, Writing, Job Match, and Ready scores make the review more useful than a single number.
3. **AI Insights + In-Depth Review.** Specific, actionable callouts on exact bullets, with suggested rewrites or prep actions.
4. **Resume → personalized interview questions pipeline.** 10–15 questions drawn from the user's actual bullets/projects. This is the core differentiator vs. ChatGPT prompting or generic LeetCode/behavioral question banks.
5. **Privacy-first** — redacted sharing, consent, delete controls. No public resume rankings, no recruiter resale.

## Positioning (one-liner)

> Interview prep built from your resume.

## Tone

- Useful first, lightly savage second. Humor can live in the brand, but the product report should feel like a serious diagnostic.
- Calibrate carefully: do **not** become demoralizing. See [decisions.md → D-005](./decisions.md#d-005-tone-calibration).

## Current state (as of this revision)

- Single-page marketing/landing site built with Next.js 15 + Tailwind, styled with a LeetCode-inspired dark theme.
- Existing UI/code still contains old "roast" terminology in places. New visible product copy should migrate to **Resume Score**, **AI Insights**, and **AI In-Depth Review** per [D-019](./decisions.md#d-019-interview-prep-first-resume-score-terminology-diagnostic-score-report).
- No backend, no auth, no persistence, no real LLM integration yet.
- Roadmap section on the landing page already communicates the phased scope (Build first / Monetize next / Later bets).

## Version strategy

- **v1** ships the MVP loop on a **completely free stack** — task-routed Gemini 2.0 Flash + Groq Llama 3.3 70B (cross-vendor failover), FastAPI on Render, Postgres on Railway, R2 for PDFs, Clerk for auth, PostHog for analytics. No paid API spend, effective cost ₹0 until traffic outgrows free tiers. Lower quality is accepted; the goal is loop validation, not best-in-class output.
- **v2** is triggered by real user feedback once v1 has ~100 users and evidence that users continue from score/review into prep. v2 = quality upgrade (likely Claude Haiku 3.5 for answer scoring, GPT-4o Mini as generalist upgrade) + first paid review/prep upgrade.

See [D-008](./decisions.md#d-008-v1-ships-on-a-completely-free-llm-v2-upgrades-after-user-feedback), [D-009](./decisions.md#d-009-llm-routing--gemini-for-analyzequestions-groq-for-evaluatefeedback-cross-vendor-failover), [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog), and [`current-goals.md`](./current-goals.md).

## Competitive landscape (acknowledged, not yet differentiated against)

- Interviewing.io, Pramp, Exponent
- Final Round AI, Yoodli, InterviewPal, Big Interview, Interviews by AI
- Teal HQ, Careerflow (resume side)
- LeetCode-style platforms (skill drilling)

The framing ("Get Uncooked") is fresh. The serious underneath is **table stakes**, so quality of the AI output and accuracy of feedback are the only durable moats.

## Non-goals (explicit)

- Not a full ATS / recruiter SaaS.
- Not a generic LeetCode clone — coding queues are a **later bet**, not the MVP.
- Not building a community before having ~1,000 active users. See [D-003](./decisions.md#d-003-defer-community).
- Not chasing multiple monetization models at once. See [D-004](./decisions.md#d-004-monetization).
