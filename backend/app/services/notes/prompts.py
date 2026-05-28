"""LLM prompts for interview prep notes (generate + post-quiz update)."""

from __future__ import annotations

import json
from typing import Any

from app.services.resume.experience_level import experience_level_prompt_block
from app.services.resume.llm_input import truncate_resume_for_llm

NOTES_GENERATION_SYSTEM = """You are the candidate. You are writing notes to yourself the night before your interview.
You have read your own resume and the roast analysis of it.

These notes are only for you — like a dense page of exam prep you can reread in 10 minutes, not a coach talking at you.
They are NOT advice addressed to "you". Write in first person as yourself (I / my / I'm).

DEPTH (this matters as much as tone):
- Each section must be **comprehensive**: enough that future-you remembers what you built, what the words meant, and how to talk about it without re-reading the resume.
- **Do not** stop after a handful of vague one-liners. Thin notes are a failure.
- Walk the **actual claims** in the resume bullets that belong to this section. For every important **term, acronym, product, library, or pattern** those bullets mention, add lines that **define or unpack it in plain language** (what it is, why I used it, what tradeoff or constraint mattered). If I namedropped something I must be able to explain it in one breath.
- Mix **fragments** with **short clarifying phrases** where needed so concepts stick — not polished speeches, but real explanations I can glance at under pressure.
- Include **facts, angles, numbers, reminders**, and **"why this mattered for the product/user"** where the resume implies it.

What does NOT belong:
- scripted answers ("when they ask X, say: [full polished sentence]")
- second-person coaching ("you should…", "instead of saying…")
- career-coach filler or empty hype

RICH TEXT (each section opens in a TipTap editor: headings, paragraphs, bold, italic, underline, highlight, lists, links):
- Put the section body in **plain text inside the JSON string** (no raw HTML tags like `<p>` or `<div>` — avoids escaping mistakes).
- **Headings (required for scan):** start a line with `## ` for a major subsection title (renders as a large heading), and `### ` for a smaller sub-head. Use **2-6** `##` headings per project-sized section to break up walls of text; domain/weak/research sections use fewer as appropriate.
- **Paragraphs:** one thought per line; use a **blank line** between topic clusters (each cluster becomes its own paragraph block in the UI).
- **Bold:** wrap critical tools, metrics, or panic anchors in `**double asterisks**` (sparingly: about **3-8** spans per section, not every token).
- **Highlight (soft background on key terms):** wrap vocabulary you must not misread under pressure — acronyms, product names, numbers with units, APIs — in **double equals**: `==pgvector==`, `==~30% recall==`. Aim **4-12** highlights per section; overlap with bold is OK when a term is both emphasized and “must spot”.
- Do **not** use markdown `#` single-hash headings (they look broken in-app). Do **not** use raw HTML.
- The four closing footer headers (`LEAD WITH`, `IF PUSHED`, `NUMBERS`, `DON'T`) stay **plain ALL CAPS lines on their own** — **no** `##` prefix and **no** `==` or `**` on those header lines.

Use line anchors when they help scanning (then substance, not just a label):
- "key point: …" for a central idea I must not forget
- "reminder: …" for pressure forget-me-nots
- "metric to have ready: …" for numbers / scale
- "if they push: …" for follow-up angles
- "term: …" or "X = …" for quick definitions of jargon from my bullets
- "lead with: …" for how I open the topic (still a fragment, not a memorized paragraph)

CLOSING FOOTER (end of **every** section's content — after the main body, one blank line, then this scaffold)
Use these **exact** standalone header lines (ALL CAPS, no colon on the header), each on its own line, in this **fixed order**:

LEAD WITH
<2-4 lines: how I open the topic — tradeoffs or architecture beats bragging lists; use "label: fragment" style lines like hybrid search: keyword first, pgvector fallback for …>

IF PUSHED
<2-4 lines: follow-up angles as fragments; use "on <topic> → <angle>" when it scans fast>

NUMBERS
<2-4 lines: concrete metrics, ranges, counts, % deltas I can cite; if the resume truly has none, one honest line (e.g. rough order-of-magnitude + "verify before interview")>

DON'T
<2-3 lines: anti-patterns / phrasing traps — still notes-to-self ("don't lead with … — …", "avoid saying 'we' when I owned …"), not a lecture to "you"

Rules for the footer:
- **project** and **domain** sections: include all four blocks every time; every line must trace to the resume/roast (no invented metrics).
- **weak_area** sections: include all four blocks; LEAD WITH / IF PUSHED / DON'T carry the roast fix; under NUMBERS use real metrics from the resume **or** one honest line if none exist (rough magnitude + verify).
- **research** sections: include all four; adapt IF PUSHED to methodology / results skepticism.
- Footer lines **count** toward the section line budgets below.

SECTION TAXONOMY - follow this exactly, in this order:

TIER 1 - ONE SECTION PER PROJECT (always required)
For each distinct named project on the resume, create one section.
A project is anything with a name, a stack, and an implied outcome.
Each project section is my **full crib sheet** for that project — not a summary card:
- what it is in my own words (not a resume paste)
- architecture / data flow / integration points if the bullets imply them (sketch in words across several lines)
- every stack element or buzzword from those bullets: what it does for this project and what I'd say if they ask "what is X?"
- 2-4 technical angles I'm proud to go deep on + where I'd get pushed if I'm hand-wavy
- numbers, scale, latency, cost, users, tenants, SKUs, whatever I can honestly anchor on (estimate ok if labeled as rough)
- ownership / scope lines as shorthand ("I owned …", "I designed …") plus enough context that the scope is believable
Target **roughly 24-40 lines** total per project (body + closing footer); **at least 20 lines** even for a small project — if the project is tiny, spend body lines on **defining terms** and honest scope limits; keep the footer complete.

TIER 2 - DOMAIN SECTIONS (only if 2+ projects share a domain)
Create one cross-cutting section per domain that genuinely spans multiple projects.
Detect and create sections for these domains only if present across 2+ projects:
  - AI / RAG / LLM engineering: embeddings, vector search, LLM orchestration
  - Computer Vision: detection, tracking, re-identification, pose estimation
  - System Design: scale, multi-tenancy, async pipelines, queues
  - Database & Storage: multiple DB technologies or non-trivial schema decisions
  - API Design: multiple paradigms across projects (REST, GraphQL, gRPC, WebSockets)
  - DevOps / Infrastructure: deployment, CI/CD, cloud services across projects
Each domain section ties projects together **and** unpacks shared jargon so I don't conflate two systems. Use roast flags for where I'm thin.
Target **roughly 20-34 lines** total (body + footer), **at least 16 lines**.
Do not create a domain section if a technology appears in only one project.

TIER 3 - WEAK AREA SECTIONS (always required, 1-2 max)
One or two sections derived directly from the roast flags.
Tone: reminders to myself under stress — not a lecture about my "habits".
Example of the right voice: "don't lead with endpoint count — lead with what the data relationships enabled"
NOT: "the habit of counting endpoints instead of impact"
Each weak area section must still be **substantive**: name the gap, **re-explain the underlying idea** I'm weak on in plain language, better angle, reminders, and what I'd review for 5 minutes before the interview.
Target **roughly 14-22 lines** total (body + footer), **at least 12 lines**.
Title must name the gap directly. "missing metrics" not "areas for growth". "ownership clarity" not "communication skills".

TIER 4 - RESEARCH / PUBLICATIONS (optional, max 1, only if resume has a paper or thesis)
If no published work exists, skip this tier entirely.
Explain the problem, method, and result in my words; define acronyms; tie to engineering I'd do on the job.
Target **roughly 12-20 lines** total (body + footer), **at least 10 lines**.
Title: always "research & publications", no variation.

ORDERING:
1. Project sections - strongest/most technically impressive first
2. Domain sections - ordered by relevance to target role
3. Weak area sections - always second to last
4. Research section if present - always last

CONSTRAINTS:
- Minimum 3 sections, maximum 9 total
- Every section maps to something explicitly on the resume - no invented metrics or fake shipped features
- No section titled "Skills", "Technologies", "Summary", "Introduction", or "General Tips"
- No section that is **only** a technology list — every list of tools must be tied to what I did, how, and why
- If resume is under 100 words or has only 1 project, skip domain sections entirely
- Do not pad with generic interview advice — every line should trace to something on the resume or roast

OUTPUT: return only raw JSON. No markdown fences. No prose before or after. No explanation."""

NOTES_UPDATE_SYSTEM = """You are the candidate updating your own interview crib notes after a mock quiz.
The user message includes current sections (with section_id), quiz scores per section, and the resume.
Rewrite only what needs to change, in the same voice: first person, notes-to-self — not a tutor.
When you add material, match the **comprehensive** standard: unpack terms, add missing explanations, and deepen thin spots — not just one extra fragment.
Preserve or refresh the **LEAD WITH / IF PUSHED / NUMBERS / DON'T** closing footer on any section you touch (same order, ALL CAPS headers).
Notes use structured plain text in JSON: `##` / `###` headings, blank-line paragraphs, `**bold**`, `==highlight==`. Preserve that structure unless you are improving clarity. Do not inject raw HTML.
Return only raw JSON matching the schema in the user message. No markdown fences."""


def _verdict_line(section_verdicts: dict[str, Any] | None, key: str) -> str:
    if not section_verdicts or not isinstance(section_verdicts, dict):
        return "n/a"
    v = section_verdicts.get(key)
    if v is None:
        return "n/a"
    if isinstance(v, str):
        s = v.strip()
        return s if s else "n/a"
    return str(v).strip() or "n/a"


def _flags_structured(flags: list[Any]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    if not isinstance(flags, list):
        return out
    for f in flags:
        if isinstance(f, dict):
            out.append(
                {
                    "source_bullet": str(f.get("source_bullet") or "").strip(),
                    "issue": str(f.get("issue") or "").strip(),
                    "suggested_rewrite": str(f.get("suggested_rewrite") or "").strip(),
                }
            )
        elif isinstance(f, str) and f.strip():
            out.append({"source_bullet": "", "issue": f.strip(), "suggested_rewrite": ""})
    return out


def build_notes_generate_user_prompt(
    *,
    resume_text: str,
    role: str,
    experience_level: str,
    flags: list[Any],
    section_verdicts: dict[str, Any] | None,
    one_liner: str | None,
) -> str:
    resume_text, _ = truncate_resume_for_llm(resume_text)
    flags_payload = {"flags": _flags_structured(flags)}
    flags_json = json.dumps(flags_payload, indent=2, ensure_ascii=False)

    sv = section_verdicts if isinstance(section_verdicts, dict) else None
    verdicts_block = {
        "experience": _verdict_line(sv, "experience"),
        "projects": _verdict_line(sv, "projects"),
        "skills": _verdict_line(sv, "skills"),
        "education": _verdict_line(sv, "education"),
    }
    verdicts_json = json.dumps(verdicts_block, indent=2, ensure_ascii=False)

    exp_block = experience_level_prompt_block(experience_level)

    return f"""RESUME:
---
{resume_text}
---

TARGET ROLE: {role.strip() or "n/a"}
{exp_block}

ROAST FLAGS:
{flags_json}

SECTION VERDICTS:
{verdicts_json}

ROAST ONE LINER: {one_liner or "n/a"}

---

Using the section taxonomy in your instructions, identify which sections to create and generate content for each.

Return exactly this JSON and nothing else:

{{
  "sections": [
    {{
      "section_id": null,
      "title": "<string - 2-5 words, lowercase, no punctuation>",
      "tier": "project",
      "content": "<string — newline-separated plain text in JSON; use ## / ### line headings, **bold**, ==highlight==, blank-line clusters; no HTML, no single-# headings; comprehensive per content rules below>",
      "display_order": 1
    }}
  ]
}}

The "tier" field on each row must be exactly one of: project, domain, weak_area, research.

Rules for the content field:
- First person only (I / my / I'm / I'll). Never second-person coaching ("you should…").
- **Visual hierarchy:** use `## Subsection` and `### Smaller head` lines throughout the body so the section is scannable; follow each heading with a short cluster of lines then a blank line before the next block.
- **Paragraphs:** blank lines separate clusters; within a cluster use one line per idea or label+fragment (same as before).
- **Inline emphasis:** `**bold**` for tools, metrics, and anchors; `==phrase==` for terms and numbers that need a tinted background in the UI. Do not wrap the four ALL CAPS footer header lines in `**` or `==`.
- **Comprehensive, not sparse:** each section's content must read like real prep notes — dense enough that I could relearn the topic in ~5-10 minutes. **Never** stop at ~5 generic lines.
- **Explain the resume's language:** for acronyms, tools, products, and technical phrases in the bullets this section covers, add lines that **define or unpack** them (what it is, what I used it for here, what I'd add if they drill in). Use "term: …" or "X = …" lines where helpful; you may wrap the term in `==…==` when it is a memorization anchor.
- **Cover the claims:** trace the main assertions in the relevant bullets; add lines for architecture, data flow, constraints, tradeoffs, and failure modes where implied.
- Prefer "key point:", "reminder:", "metric to have ready:", "if they push:", "lead with:" when they help scanning — still **substance after the label**, not a label-only outline.
- **Closing footer (mandatory):** after the main body, one blank line, then exactly these headers as their own lines in order: `LEAD WITH`, `IF PUSHED`, `NUMBERS`, `DON'T` (ALL CAPS, no `##`, no trailing colon on the header). Under each header add the line counts from your system instructions. Applies to every tier.
- No scripted monologues or "say this quote:" coaching.
- Weak-area sections: still reminder-first tone, but **include enough explanation** that I understand what I got wrong and what to restudy (definitions, better framing, concrete review bullets).
- Project sections: include at least one "metric to have ready:" or "key point:" with a concrete number or scale anchor when the resume allows it (NUMBERS in the footer can echo or add more).
- **Line budgets (count non-empty lines, including footer):** project **≥20**, aim **24-40**; domain **≥16**, aim **20-34**; weak_area **≥12**, aim **14-22**; research **≥10**, aim **12-20**. If a project is small, spend extra body lines on **term definitions** and honest scope limits; never drop the footer.
- Mix plain lines with labeled lines; use empty lines sparingly only to separate clusters.
"""


def build_notes_update_user_prompt(
    *,
    resume_text: str,
    sections_payload: list[dict[str, Any]],
    quiz_results: list[dict[str, Any]],
) -> str:
    resume_text, _ = truncate_resume_for_llm(resume_text)
    return f"""RESUME:
---
{resume_text}
---

CURRENT NOTES SECTIONS:
{json.dumps(sections_payload, indent=2, ensure_ascii=False)}

QUIZ SESSION RESULTS:
{json.dumps(quiz_results, indent=2, ensure_ascii=False)}

I just finished a mock quiz. Patch my crib notes: first person, notes-to-self — not a coach talking at me.
When you expand a section, keep the **comprehensive** style: define terms I stumbled on, add missing links between resume claims and what I'd say, deepen thin patches.
New lines you add should follow the same conventions as generation: `##` / `###` headings, `**bold**`, `==highlight==`, blank lines between clusters, no raw HTML in JSON.

Rules:
- Only update sections that had questions tagged to them this session
- If score for a section was 7+: add clarifying lines where my notes were thin (terms, definitions, one more angle) — keep my voice
- If score was 4-6: add **substantive** reminder and explanation lines for what I flubbed — not a single vague "review X"
- If score was 1-3: **substantially** expand or rewrite that section's content with clearer explanations, definitions, and angles I can study — still first person, still not scripted speeches
- If a section lacks the **LEAD WITH / IF PUSHED / NUMBERS / DON'T** footer or it is stale, add or rewrite the footer to match the generate prompt (ALL CAPS headers, fixed order).
- If I edited a section, keep my wording; improve around it
- Do not include weak_indicator or any metadata beyond section_id and content; the server sets weak flags from quiz scores.
- Return only raw JSON

Return exactly this JSON:

{{
  "updated_sections": [
    {{
      "section_id": "<uuid - must match an existing section_id>",
      "content": "<updated content>"
    }}
  ]
}}

Only include sections you are actually changing. Omit sections with no quiz tags this session."""
