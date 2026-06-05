# Get Uncooked — Backend Architecture & Output Spec (source of truth)

This document mirrors the product contract for the resume roast: **one unified LLM response**, **Gemini primary + Groq failover**, R2/B2-style storage with **`uploads/{resume_id}.pdf`**, and **public share cards without flags or questions**.

Implementation lives in:

- `backend/app/services/resume/analyzer.py` — single-call roast + heat label from score
- `backend/app/services/resume/pipeline.py` — pipeline + persistence
- `backend/app/api/v1/routes/roast.py` — flat REST aliases (`/score/{id}`, …)
- `frontend/src/components/resume-roast-demo.tsx` — output layout

---

## Stack & Resources

**Models (priority):**

- **Primary:** Google API `GEMINI_MODEL` (default **Gemma 4 31B IT**; fallback **Gemini 2.0 Flash**) — scoring + question generation in **one** JSON payload.
- **Fallback:** Groq (Llama 3.3 70B) (`GROQ_API_KEY`) — same prompts on 429 / timeout / 5xx after primary fails.
- **Never** expose which model ran in the UI.

**Database:** PostgreSQL (`DATABASE_URL`, async SQLAlchemy + asyncpg). Analysis rows store structured output in JSONB plus `share_slug`, `one_liner`, `model_used`, `failure_reason`, etc.

**File storage:** S3-compatible (`R2_*`). Key pattern: `uploads/{resume_id}.pdf`. **After** text is extracted from the uploaded bytes, the object is **deleted**; raw PDF is not retained.

**Auth:** Clerk optional later. Anonymous uploads use a shadow `users` row for daily caps (`3` analyses/day) per existing product rules.

---

## API (implemented under `/api/v1/`)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/v1/analyze` | Body: `{ "resume_id", "role" }` — updates role, enqueues pipeline |
| `POST` | `/api/v1/resume/upload` | Multipart: `target_role`, `resume_text` **or** `file` |
| `POST` | `/api/v1/resume/{resume_id}/analyze` | Enqueue without body (role from resume row) |
| `GET` | `/api/v1/score/{resume_id}` | Score bundle (+ `one_liner`, `role`, …) |
| `GET` | `/api/v1/flags/{resume_id}` | `{ "flags": [...] }` |
| `GET` | `/api/v1/questions/{resume_id}` | `{ "questions": [...] }` |
| `GET` | `/api/v1/sections/{resume_id}` | `{ "section_verdicts": {...} }` |
| `GET` | `/api/v1/resume/{resume_id}/score` | Superset / compat (includes `score_breakdown`) |
| `GET` | `/api/v1/share/{slug}` | **Public** — score, heat, one-liner, role only |
| `GET` | `/api/v1/resume/.../events` | SSE — see below |

**SSE** (`data:` lines) — primary shape:

```json
{"step":"extracting"}
{"step":"scoring"}
{"step":"flagging"}
{"step":"questions"}
{"step":"done","resume_id":"…","share_slug":"…","cooked_score":71,…}
{"step":"error","reason":"models_unavailable"}
```

Reasons map from internal `failure_reason` (e.g. `too_short` → surfaced as appropriate).

---

## Analysis pipeline

1. **Extract** — PDF: `pdfplumber` (pymupdf fallback if empty). Paste: normalized text. **Reject** `< 30` words: `too short to roast`.
2. **Single LLM call** — JSON with `score`, `one_liner`, `section_verdicts`, `flags` (max 5 after filtering), `questions` (8–10, `from_resume` | `gap`).
3. **Heat label** — **Derived from score in code** (not trusted from the model):

| Score | Label |
|------|--------|
| 0–30 | Cooked |
| 31–55 | Hard |
| 56–75 | Medium |
| 76–100 | Raw |

4. **No canned output** — if both providers fail or JSON is invalid, analysis fails and SSE emits `error` (no fake roast).

**Output token budget:** `llm_max_output_tokens` (default **1500**) on Gemini and Groq.

---

## Share card (public)

`/share/{slug}` and OG image: **score, heat label, one-liner, role** — **no** flags or interview questions. CTA: roast yours → `getuncooked.pro`.

---

## What the LLM prompt must not do

- No generic “tips to strengthen your resume”
- No hedging
- No compliments before the critique
- No bullet list inside the one-liner
- No rubric / math explanation for the score

---

## What gets sent to the LLM

### System prompt (same for Gemini and Groq)

```
You are a senior software engineer and hiring manager with 10+ years of
experience interviewing candidates at high-growth startups and FAANG.
You have zero tolerance for vague resumes. You've seen 10,000 resumes
and you can tell in 30 seconds if someone actually shipped something or
just listed technologies.

Your job is to roast this resume ruthlessly but fairly. You are not a
career coach. You do not encourage. You identify exactly what an
interviewer will call out in the room and you say it directly.

Rules:
- Every claim you make must be traceable to a specific bullet in the resume
- Never give generic advice that could apply to any resume
- If something is actually good, skip it — don't pad
- Rewrites must sound like a real engineer wrote them, not a career blog
- Return only valid JSON. No preamble, no markdown, no explanation.
```

### User message template

```
ROLE: Full Stack Developer

RESUME:
---
<text>
---

WORD COUNT: 87
SECTIONS DETECTED: projects, experience (no education, no skills section found)

Return this exact JSON shape and nothing else:
{ ... }  // see `analyzer._build_user_prompt` for the canonical schema string
```

**Injected dynamically:**

- `ROLE` — dropdown value
- `RESUME` — extracted text; normalized whitespace; truncated for LLM with a trailing `[truncated — …]` note when over the soft token budget (`llm_resume_text_token_soft_limit`, default 1500-token heuristic)
- `WORD COUNT` — from full parsed text (before LLM truncation)
- `SECTIONS DETECTED` — regex pre-pass (`app/services/resume/sections.py`)

**Never sent:** filename, upload time, user identity, anything not in resume text.

---

## One call vs three

**One call** only — the unified JSON schema covers score + flags + questions. Splitting into multiple calls is reserved only for future output-size emergencies (not v1).
