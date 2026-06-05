# UI Overhaul Plan - Interview Prep First

**Date**: 2026-06-03  
**Status**: Updated after product direction change  
**Purpose**: Simplify the Get Uncooked UI around interview prep as the main product, with Resume Score as the diagnostic entry point that powers AI insights, in-depth review, and practice.

## Reference Reviewed

- ResuMax homepage: https://www.resumax.ai/
- What to borrow: simple nav, one primary CTA, proof object before feature explanations, concrete score/breakdown preview, before/after rewrite example, numbered loop.
- What not to copy: fake hiring logos/social proof unless verified, broad "career copilot" claims, pricing pressure, or any feature not actually available.

## Product Direction

The product should read as:

> Build an interview prep plan from your resume. Start with a Resume Score, understand the AI insights, then practice against the exact gaps your resume creates.

Important terminology:

- Say **Resume Score**, not "resume roast."
- Say **AI Insights**, not "flags" or "red flags."
- Say **AI In-Depth Review** for the deeper written analysis.
- Keep "Get Uncooked" as the brand, but make the product experience more useful and less meme-first.
- Stop using cooked/meme images on the score card.

## Current Diagnosis

The current UI has useful pieces, but they need a cleaner hierarchy.

1. The homepage currently mixes prep plan, resume scoring, quizzes, notes, seminar, and dashboard concepts without a single dominant flow.
2. The last plan overcorrected toward "roast-first." That is no longer the direction.
3. The score card currently leans on a single number and meme imagery. The new score page should feel like a serious diagnostic report.
4. The dashboard mixes score, insights, questions, notes, quiz history, and saved resumes. These should become a guided prep workflow.
5. The repo has two visual systems mixed together:
   - Documented system: `lc.*` LeetCode-inspired dark UI.
   - Newer landing system: `lv.*` rust/cream editorial UI plus `Playfair_Display` and a custom cursor.

## Target User Journey

1. User lands on `/` and understands this is an AI interview prep product.
2. User uploads or pastes resume and chooses target role/interview context.
3. User gets a **Resume Score** with multiple dimensions:
   - ATS: `17/20`
   - Content: `31/40`
   - Writing: `7/10`
   - Job Match: `21/25`
   - Ready: `5/5`
4. User sees their resume PDF preview beside the score/review on the score page.
5. User reads **AI Insights** and **AI In-Depth Review**.
6. User starts a prep plan or practice questions based on the score gaps.

## Target Information Architecture

### Public Routes

- `/`
  - Main landing page.
  - One job: convince user to start interview prep.
  - Primary CTA: `Start interview prep`.
  - Secondary CTA: `See sample score`.
- `/roast`
  - Rename in UI copy to **Resume Score** or **Score my resume**.
  - Route can stay `/roast` temporarily to avoid breaking links, but visible copy should not say "roast."
  - Inputs: target role, experience level, PDF or pasted resume.
  - Output while running: staged progress via SSE.
- `/share/[slug]`
  - Public score/review preview.
  - No meme/cooked images.
  - Score breakdown plus AI insights preview.
- `/sign-in`, `/sign-up`
  - Auth only. Keep Clerk defaults.

### Authenticated Routes

- `/dashboard`
  - Main result and prep hub after upload.
  - Primary sections:
    - Resume Score
    - AI Insights
    - AI In-Depth Review
    - Interview Questions / Practice
    - Prep Plan
- `/plan`, `/prep`, `/notes`, `/quiz/*`
  - These are no longer hidden extras. They are the main continuation after scoring.
  - The score should feed the plan and practice surfaces.
- `/seminar`
  - Remove from primary nav unless the user explicitly decides it is part of the public product.

## Proposed Landing Page Structure

Use ResuMax's structure as the IA reference, adapted to interview prep.

1. **Nav**
   - Logo
   - `How it works`
   - `Sample score`
   - `Sign in`
   - Primary CTA: `Start interview prep`
   - Do not show `Seminar` in public nav.
   - Show `Dashboard` only for signed-in users.

2. **Hero**
   - H1: "Interview prep built from your resume."
   - Supporting copy: "Upload your resume, get a multi-dimensional Resume Score, then practice the questions your resume is most likely to trigger."
   - Primary CTA: `Start interview prep`
   - Secondary CTA: `See sample score`
   - First-viewport proof: score/review preview with dimensions, not a meme card.

3. **Proof Section**
   - Two-column layout on desktop:
     - Left: resume PDF preview.
     - Right: Resume Score panel.
   - Score dimensions:
     - ATS `17/20`
     - Content `31/40`
     - Writing `7/10`
     - Job Match `21/25`
     - Ready `5/5`
   - Include 2-3 AI Insights.
   - Include a short AI In-Depth Review excerpt.

4. **How It Works**
   - Step 1: Upload resume.
   - Step 2: Get Resume Score + AI Insights.
   - Step 3: Generate prep plan and practice questions.
   - Step 4: Work the plan before the interview.

5. **Feature Trio**
   - Resume Score: multi-dimensional diagnostic, not just one number.
   - AI Insights + In-Depth Review: exact issues, rewrites, and reasoning.
   - Interview Prep Plan: questions, modules, quizzes, notes, and daily prep.

6. **Trust / Privacy**
   - Where resume text goes.
   - Retention behavior.
   - Free experimental model honesty.
   - Daily limits.

7. **FAQ**
   - "Is this only a resume checker?"
   - "What does the Resume Score measure?"
   - "Do you store my resume?"
   - "Can I share my score without exposing my resume?"
   - "How does this become interview prep?"

8. **Final CTA**
   - Repeat `Start interview prep`.

## Score Page Requirements

The score page is a diagnostic report, not a meme card.

Desktop layout:

- Left column: resume PDF preview.
- Right column: Resume Score, dimension breakdown, AI Insights, AI In-Depth Review, next action.

Mobile layout:

- Score summary first.
- Dimension breakdown.
- AI Insights.
- AI In-Depth Review.
- Collapsible resume preview below.

Score model:

- It may still include a total score for quick scanning, but the UI must never show only one number.
- Required visible dimensions:
  - ATS: `0-20`
  - Content: `0-40`
  - Writing: `0-10`
  - Job Match: `0-25`
  - Ready: `0-5`
- Example display:
  - ATS `17/20`
  - Content `31/40`
  - Writing `7/10`
  - Job Match `21/25`
  - Ready `5/5`
- Include a short label like `Ready`, `Needs polish`, or `High risk`, but do not lean on "cooked" labels for the professional report.

AI Insights:

- Replace "Red Flags" labels in the UI.
- Each insight should include:
  - Source resume section or bullet.
  - What the AI noticed.
  - Why it matters for interviews.
  - Suggested rewrite or prep action.

AI In-Depth Review:

- A longer narrative review below the score and insights.
- Should summarize strengths, risks, interview story gaps, and recommended prep focus.
- Can be collapsible if long.

Resume PDF preview:

- Show the uploaded PDF beside the score page on desktop when available.
- If only pasted text exists, show a resume text preview panel instead.
- Preview must not appear on public share pages unless explicitly safe/redacted.

## Visual System Direction

Default recommendation: keep core product surfaces on the documented `lc.*` LeetCode-inspired dark system, but make the report more professional than meme-like.

Rules for agents:

1. Use `lc-bg`, `lc-header`, `lc-surface`, `lc-elevated`, `lc-border`, `lc-text`, `lc-muted`, `lc-dim`, `lc-orange`, and semantic difficulty colors.
2. Use Inter and JetBrains Mono for core UI.
3. Remove cooked/meme images from `ScoreCard`.
4. Remove the custom cursor from core app routes. It adds novelty but hurts utility and mobile clarity.
5. Keep page density tight and tool-like.
6. Do not add new brand colors during this pass.

## Page-Level Work Plan

### Phase 1 - Align Scope, Nav, And Terminology

Files:

- `frontend/src/components/landing/landing-nav.tsx`
- `frontend/src/components/landing/landing-hero-actions.tsx`
- `frontend/src/components/landing/landing-footer-cta.tsx`
- `frontend/src/lib/landing-content.ts`
- `frontend/src/app/layout.tsx`

Tasks:

- Make `Start interview prep` the primary public CTA.
- Replace visible "roast" copy with "resume score," "score my resume," or "start interview prep."
- Replace "flags" / "red flags" labels with "AI Insights."
- Remove `Seminar` from public nav.
- Keep `Plan` visible only where it supports interview prep, not as a competing CTA.
- Update metadata from "resume roast" or "AI Interview Prep" to resume-powered interview prep.

Acceptance:

- A signed-out user sees exactly one primary next action.
- Public copy makes interview prep the main focus.
- No visible public copy says "resume roast."

### Phase 2 - Replace Meme Score Card With Diagnostic Score Report

Files:

- `frontend/src/components/score/ScoreCard.tsx`
- `frontend/src/app/share/[slug]/page.tsx`
- `frontend/src/app/share/[slug]/opengraph-image.tsx`
- `frontend/src/lib/score-meme.ts`

Tasks:

- Remove cooked/meme image usage from the score card.
- Add a score breakdown component for ATS, Content, Writing, Job Match, and Ready.
- Keep total score optional, but visually secondary to the breakdown.
- Update OG image to use the same professional score hierarchy.
- Keep `/share/[slug]` free of internal UUIDs and private resume content.

Acceptance:

- Score card still screenshots well at 375 px.
- Card communicates dimensions at a glance.
- No cooked/meme imagery appears on score/share surfaces.

### Phase 3 - Add Resume Preview To Score Page

Files:

- `frontend/src/components/roast/roast-dashboard.tsx`
- `frontend/src/components/score/ScoreCard.tsx` or new report component
- `frontend/src/lib/api.ts`
- Backend route only if current API does not expose a safe PDF preview URL

Tasks:

- Add a desktop two-column score layout: resume preview + score report.
- Show PDF preview when available.
- Show text preview fallback for pasted resumes.
- Do not expose resume preview publicly on `/share/[slug]` unless redacted and explicitly approved.

Acceptance:

- Desktop score page shows resume preview beside the report.
- Mobile score page keeps score readable before preview.
- Preview respects auth/privacy boundaries.

### Phase 4 - Rebuild Landing Around Interview Prep

Files:

- `frontend/src/lib/landing-content.ts`
- `frontend/src/components/landing/landing-home.tsx`
- `frontend/src/components/landing/landing-hero.tsx`
- `frontend/src/components/landing/landing-prep-preview.tsx` or replacement component
- `frontend/src/app/page.tsx`

Tasks:

- Rewrite landing content around interview prep powered by Resume Score.
- Replace any roast-first proof with score + prep proof.
- Keep the first product visual as score/review + resume preview.
- Keep prep plan, questions, quiz, and notes as the continuation of the score.

Acceptance:

- Above the fold answers: what is this, what do I do, what do I get?
- The first product visual includes the multi-dimensional Resume Score.
- Interview prep is the main promise.

### Phase 5 - Simplify Upload Into A Score/Prep Intake

Files:

- `frontend/src/app/roast/page.tsx`
- `frontend/src/components/roast/roast-upload.tsx`
- `frontend/src/components/ui/pipeline-progress.tsx`

Tasks:

- Keep the same backend/API behavior initially.
- Rename visible page title to `Score your resume` or `Start interview prep`.
- Reduce explanatory copy.
- Present the flow as:
  1. Target role
  2. Experience level
  3. Resume
- Keep PDF/paste segmented control.
- Keep staged progress, but use plain language:
  - Reading resume
  - Scoring resume
  - Finding AI insights
  - Building prep questions

Acceptance:

- A user can understand what to fill without reading a paragraph.
- 375 px mobile has no horizontal overflow and the CTA remains visible after input.
- Loading, error, empty, rate-limited, and degraded states remain intact.

### Phase 6 - Simplify Dashboard Into A Prep Hub

Files:

- `frontend/src/components/roast/roast-dashboard.tsx`
- `frontend/src/components/notes/notes-study-page.tsx`
- `frontend/src/components/interview/*`
- `frontend/src/components/plan/*`

Tasks:

- Top-level dashboard hierarchy:
  - Resume Score
  - AI Insights
  - AI In-Depth Review
  - Practice Questions
  - Prep Plan
- Move quiz history and notes into their relevant prep surfaces.
- Keep "upload new" secondary.
- Add a clear next action after score: `Build prep plan` or `Practice questions`.

Acceptance:

- Dashboard feels like a prep command center, not a collection of unrelated tabs.
- Resume Score flows naturally into prep.

### Phase 7 - Consolidate Styling

Files:

- `frontend/src/app/landing-v3.css`
- `frontend/tailwind.config.ts`
- Components currently using `lv-*` classes

Tasks:

- Prefer Tailwind classes with `lc.*` tokens for new and changed UI.
- Remove unused `lv` theme classes once landing/upload/quiz surfaces are migrated.
- Remove custom cursor usage from `frontend/src/app/page.tsx`, `/roast`, and `/dashboard`.
- Keep `landing-v3.css` only for reusable layout utilities during migration, then shrink it aggressively.

Acceptance:

- Core routes `/`, `/roast`, `/dashboard`, `/share/[slug]`, `/plan`, and `/quiz/*` feel like one product.
- No new `lv-*` usage in core surfaces.

### Phase 8 - Verification Pass

Run after implementation:

- `cd frontend && npm run lint`
- Visual check `/` at desktop and 375 px mobile.
- Visual check intake route at desktop and 375 px mobile.
- Visual check `/dashboard` with a completed score.
- Visual check `/share/[slug]` at 375 px and OG dimensions.

Manual UX checks:

- Can a new user explain the product after 5 seconds?
- Is interview prep the main promise?
- Is Resume Score clearly multi-dimensional?
- Are AI Insights labeled consistently?
- Does the score page show the resume preview only where privacy allows it?
- Are all async surfaces non-blank after 2 seconds?

## Copy Direction

Use short, concrete copy.

Recommended examples:

- Hero H1: "Interview prep built from your resume."
- Hero sub: "Upload your resume, get a multi-dimensional score, and practice the questions your resume is likely to trigger."
- Primary CTA: "Start interview prep"
- Secondary CTA: "See sample score"
- Intake CTA: "Score my resume"
- Section label: "AI Insights"
- Section label: "AI In-Depth Review"

Avoid:

- "Resume roast"
- "Red flags"
- "Roast my resume"
- "Cooked images" or meme-led score cards
- Broad hiring outcome claims unless backed by real data

## Hard Constraints

- Do not add paid models.
- Do not build payment, community, seminars, voice, flashcards, or JD targeting as part of this overhaul.
- Do not expose internal UUIDs in public URLs.
- Do not expose private resume previews on public share pages.
- If the backend schema/API needs score-dimension fields, use Alembic and keep old rows compatible.
- If a visual-system decision changes, update `plans/design-system.md` and add an ADR in `plans/decisions.md`.

## Suggested First PR

First PR should be small and high-impact:

1. Change public copy and CTAs from roast-first to interview-prep-first.
2. Rename visible "flags" labels to "AI Insights."
3. Remove cooked/meme image usage from `ScoreCard`.
4. Add static score-dimension UI for ATS, Content, Writing, Job Match, and Ready using existing score payload fallback values.
5. Add the score page layout skeleton for resume preview, using a placeholder if the API does not yet expose the PDF safely.

This gives users the new product story without immediately forcing a backend rewrite.
