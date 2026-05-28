"""System + user prompts for adaptive resume interviews."""

from __future__ import annotations

import json

from app.services.resume.experience_level import experience_level_prompt_block
from app.services.resume.llm_input import truncate_resume_for_llm


def build_interview_system_prompt(
    *,
    resume_text: str,
    role: str,
    hard_mode: bool,
    study_notes: list[dict[str, str]] | None = None,
) -> str:
    resume_text, _ = truncate_resume_for_llm(resume_text)
    extra = ""
    if hard_mode:
        extra = (
            "\nHARD MODE: calibrate one difficulty level higher than usual after the first "
            "question; keep questions sharp and senior.\n"
        )
    notes_block = ""
    if study_notes:
        notes_json = json.dumps(study_notes, ensure_ascii=False, indent=2)
        notes_block = f"""

CANDIDATE'S STUDY NOTES:
{notes_json}

Prefer generating questions from these notes sections — the candidate studied this material.
Each section has: section_id (UUID), section_kind (experience | project | skills | certifications | other),
section_tag (stable string like experience:0, project:1, skills, certifications), title, content.

Tag each question with BOTH:
- source_note_section_id: the section_id string from the notes JSON when known, or null
- source_note_section_tag: the section_tag string from the notes JSON when known, or null

At least one of the two should be set when the question clearly maps to a section; prefer section_id when both are known.
If a question doesn't map cleanly to any section, set both to null.
"""
    return f"""You are a senior engineer conducting a live technical interview.
The candidate's resume text below was stored when they uploaded their resume; treat it as the
only source of their claimed experience for this session.

Your job each turn: grade their last answer honestly, update a rolling session summary, and
produce the next calibrated question (or close the session on the final turn).

RESUME (verbatim text from the candidate's file):
---
{resume_text}
---

TARGET ROLE: {role}
{extra}{notes_block}
DIFFICULTY CALIBRATION:
- grade 8-10 → escalate difficulty one level
- grade 5-7  → hold current difficulty
- grade 1-4  → drop one level, probe the gap harder

QUESTION RULES:
- from_resume: must reference a specific bullet or project from this resume — impossible to answer generically
- gap: targets something vague, missing, or unclaimed in the resume
- system_design: scales the scenario to match the seniority implied by this resume
- industry_standard: tests a core competency pillar expected for this role that the resume does
  not address. Use once or twice per session to simulate a real "curveball" round.
  Prefix the question text with the competency area (e.g. "On system design: ...", "On algorithms: ...").
- never repeat a question already asked this session (the rolling summary lists prior questions)

OUTPUT CONTRACT:
- Return a single JSON object only. No markdown code fences, no text before or after.
- Follow the schema in the user message exactly for that turn (start vs answer).
- Use only double-quoted JSON strings. Booleans are true/false; use null where a field allows it."""


def build_start_user_prompt() -> str:
    example = {
        "first_question": {
            "question": "Pick one specific project bullet and ask a question that only someone who did that work can answer.",
            "difficulty": "medium",
            "bucket": "from_resume",
            "source_bullet": "exact substring from the resume you are probing, or null",
        }
    }
    return f"""START TURN — no candidate answer yet.

Produce the first interview question only. It must be medium difficulty and bucket "from_resume".

Required JSON schema (replace example values with your question; keep key names and types):

{json.dumps(example, indent=2)}

Rules:
- Top-level keys MUST be exactly: first_question (no other top-level keys).
- difficulty MUST be the string "medium" for this turn.
- bucket MUST be "from_resume".
- source_bullet MUST either be a substring copied from the RESUME in the system message or null."""


def build_turn_user_prompt(
    *,
    session_summary: str | None,
    questions_asked: int,
    last_question: str,
    last_difficulty: str,
    candidate_answer: str,
) -> str:
    payload = {
        "session_summary": session_summary,
        "questions_asked": questions_asked,
        "last_question": last_question,
        "last_difficulty": last_difficulty,
        "candidate_answer": candidate_answer,
    }
    head = json.dumps(payload, ensure_ascii=False)

    example_continue = {
        "grade": {
            "score": 7,
            "verdict": "One sentence on how well they answered.",
            "what_they_missed": "What a strong answer would mention, or null.",
        },
        "updated_summary": "Compressed session narrative, max ~120 words; include prior questions.",
        "next_difficulty": "medium",
        "next_question": {
            "question": "Next interview question text.",
            "difficulty": "medium",
            "bucket": "from_resume",
            "source_bullet": "Resume substring or null.",
            "source_note_section_id": "uuid of the notes section this question came from, or null",
            "source_note_section_tag": "section_tag from notes (e.g. experience:0, skills), or null",
        },
        "session_complete": False,
        "final_summary": None,
    }

    example_finish = {
        "grade": {
            "score": 8,
            "verdict": "One sentence.",
            "what_they_missed": None,
        },
        "updated_summary": "Final short summary.",
        "next_difficulty": "hard",
        "next_question": None,
        "session_complete": True,
        "final_summary": {
            "final_score": 72,
            "heat_label": "Medium",
            "breakdown": {
                "technical_depth": "7/10 — one line",
                "communication": "6/10 — one line",
                "resume_honesty": "8/10 — answers vs resume claims",
            },
            "weakest_area": "string",
            "strongest_area": "string",
            "suggested_next_difficulty": "medium",
        },
    }

    return f"""{head}

ANSWER TURN — grade the answer and either ask the next question OR close the session.

Session rule: at most 10 scored answers total. Field questions_asked is how many answers were
already completed BEFORE this one. After grading this answer, the new count is questions_asked + 1.

- If questions_asked is 9 in the JSON above, this answer is the 10th and last: set session_complete to true,
  next_question to null, and fill final_summary. Set next_difficulty to reflect difficulty of the
  question you just graded.
- Otherwise set session_complete to false, include next_question (with difficulty matching next_difficulty),
  and set final_summary to null.

Example JSON when the session continues:
{json.dumps(example_continue, indent=2)}

Example JSON when this answer ends the session (10th answer):
{json.dumps(example_finish, indent=2)}

Strict rules:
- Root object keys exactly: grade, updated_summary, next_difficulty, next_question, session_complete, final_summary (no extras).
- grade.score: integer 1-10.
- next_difficulty and next_question.difficulty: each must be one of "easy", "medium", "hard".
- next_question.bucket: one of "from_resume", "gap", "system_design".
- next_question.source_note_section_id: UUID string matching a section_id from CANDIDATE'S STUDY NOTES when those notes exist in the system prompt, otherwise null.
- next_question.source_note_section_tag: section_tag string from those notes (e.g. project:0), otherwise null. Set at least one of the two when the question maps to a section.
- When session_complete is false: final_summary must be null; next_question must be an object.
- When session_complete is true: next_question must be null; final_summary must include numeric final_score (0-100),
  heat_label one of Raw, Medium, Hard, Cooked, plus breakdown, weakest_area, strongest_area, suggested_next_difficulty.
"""


def build_question_bank_system_prompt(
    *,
    resume_text: str,
    role: str,
    experience_level: str,
    hard_mode: bool,
    question_count: int,
    study_notes: list[dict[str, str]] | None = None,
) -> str:
    resume_text, _ = truncate_resume_for_llm(resume_text)
    extra = ""
    if hard_mode:
        extra = "\nHARD MODE: bias questions toward senior, unforgiving depth.\n"
    notes_block = ""
    if study_notes:
        notes_json = json.dumps(study_notes, ensure_ascii=False, indent=2)
        notes_block = f"""

CANDIDATE'S STUDY NOTES:
{notes_json}

Prefer generating questions from these notes sections — the candidate studied this material.
Each section has: section_id (UUID), section_kind (experience | project | skills | certifications | other),
section_tag (stable string like experience:0, project:1, skills, certifications), title, content.

Tag each question with BOTH:
- source_note_section_id: the section_id string from the notes JSON when known, or null
- source_note_section_tag: the section_tag string from the notes JSON when known, or null

At least one of the two should be set when the question clearly maps to a section; prefer section_id when both are known.
If a question doesn't map cleanly to any section, set both to null.
"""
    exp_block = experience_level_prompt_block(experience_level)
    return f"""You generate a realistic interview question bank for a candidate.
The client shows all {question_count} questions at once; the candidate answers offline; an LLM scores later.

STEP 1 — ROLE COMPETENCY PILLARS:
Before writing any questions, silently identify the 3 core competency pillars every
interviewer for "{role}" will test, regardless of what is on the resume. Examples:
  - Software Engineer (mid/senior): [System Design & Scalability, DSA & Algorithms, Concurrency & Reliability]
  - Growth Marketer: [Paid Acquisition & CAC/LTV, Attribution & Analytics, A/B Testing & CRO]
  - Product Manager: [Product Sense & Prioritisation, Metrics & Experimentation, Strategic Trade-offs]
Derive the correct pillars from your training knowledge for the actual target role.

STEP 2 — RESUME vs PILLAR:
For each pillar, check: does the resume explicitly address this competency?
  - If yes → you may ask a from_resume or gap question anchored to it.
  - If no  → you MUST generate at least one industry_standard question for it.

RESUME:
---
{resume_text}
---

TARGET ROLE: {role}
{exp_block}
{extra}{notes_block}
RULES:
- Mix buckets: from_resume (anchor to a resume bullet), gap (probe a resume hole),
  system_design (at most 2-3 if seniority fits), industry_standard (pillars not on the resume).
- Include at least 2 industry_standard questions (more if the resume is thin on fundamentals).
- Difficulty progression is allowed (start medium, include easy and hard as needed).
- No two questions asking the same thing. No fluff.

OUTPUT: JSON only, no markdown fences."""


def _batch_part_hint(*, part_index: int | None, part_total: int | None) -> str:
    if part_index is None or part_total is None or part_total < 2:
        return ""
    return (
        f"\n\nThis request is part {part_index} of {part_total} parallel batches. "
        "Return questions only for this slice; do not duplicate topics covered in other parts."
    )


def build_batch_questions_user_prompt(
    *,
    question_count: int,
    include_note_tagging: bool,
    part_index: int | None = None,
    part_total: int | None = None,
) -> str:
    item: dict[str, object] = {
        "question": "string",
        "difficulty": "easy | medium | hard",
        "bucket": "from_resume | gap | system_design | industry_standard",
        "source_bullet": "resume substring or null",
    }
    note_rules = ""
    if include_note_tagging:
        item["source_note_section_id"] = (
            "uuid of the notes section this question came from, or null if notes don't exist for this resume"
        )
        item["source_note_section_tag"] = (
            "section_tag from notes (e.g. experience:0, skills, certifications), or null"
        )
        note_rules = (
            "\n- source_note_section_id / source_note_section_tag: when CANDIDATE'S STUDY NOTES appear in the "
            "system message, set at least one to tie the question to a section (prefer section_id when sure). "
            "Use null for both if the question does not map to a section."
        )
    return f"""Return a single JSON object with exactly one top-level key: "questions".

The value must be an array of length **exactly {question_count}**. Each element must have this shape:
{json.dumps(item, indent=2)}

Rules:
- len(questions) MUST be {question_count}.
- Each question is specific to this resume; from_resume items must be impossible to answer without that resume.
- source_bullet: exact substring from the resume when bucket is from_resume, otherwise null.
- source_bullet MUST be null for industry_standard questions.
- At least 2 items must have bucket "industry_standard"; name the competency pillar in the question text
  (e.g. "On system design: ...", "On algorithms: ...", "On paid acquisition: ...").
- Vary difficulty and bucket across all questions.{note_rules}{_batch_part_hint(part_index=part_index, part_total=part_total)}"""


def build_jd_question_bank_system_prompt(
    *,
    resume_text: str,
    role: str,
    experience_level: str,
    job_description: str,
    hard_mode: bool,
    question_count: int,
    study_notes: list[dict[str, str]] | None = None,
) -> str:
    resume_text, _ = truncate_resume_for_llm(resume_text)
    extra = ""
    if hard_mode:
        extra = "\nHARD MODE: bias questions toward senior, unforgiving depth.\n"
    notes_block = ""
    if study_notes:
        notes_json = json.dumps(study_notes, ensure_ascii=False, indent=2)
        notes_block = f"""

CANDIDATE'S STUDY NOTES:
{notes_json}

You may tie questions to these sections when relevant. Tag with source_note_section_id / source_note_section_tag when applicable (same rules as standard quizzes).
"""
    exp_block = experience_level_prompt_block(experience_level)
    return f"""You are an expert technical interviewer conducting a real job interview.

The client will show all {question_count} questions at once; the candidate answers offline; an LLM scores later.

STEP 1 — ROLE COMPETENCY PILLARS:
Silently identify the 3 core competency pillars every interviewer for "{role}" will test,
independent of what the candidate wrote. Then check: does the JD emphasise any of these
pillars explicitly? Weight those even heavier.

STEP 2 — RESUME + JD GAP vs PILLAR:
If a pillar is neither addressed in the resume nor mentioned in the JD, still include at
least 1 industry_standard question for it — interviewers test fundamentals the JD did not advertise.

Candidate profile:
- Target role: {role}
{exp_block}

CANDIDATE RESUME:
---
{resume_text}
---

JOB DESCRIPTION:
---
{job_description}
---

Generate {question_count} interview questions this specific candidate will actually face in this specific interview.

Rules:
- Calibrate difficulty strictly to the experience level above (fresher: fundamentals and projects only, no system design; senior: deep system design and scope).
- Extract core requirements and keywords from the JOB DESCRIPTION. Weight questions toward what the JD explicitly asks for. If the JD mentions Redis, ask about Redis. If it mentions scale, ask about scale.
- Reference the candidate's actual resume — specific projects, specific technologies they listed. Never ask generic questions any candidate could get.
- Mix types: Technical, Behavioural, System Design (only if experience level allows), Resume-specific, Industry-standard.
- Include at least 1 industry_standard question for any core role pillar not covered by the resume or JD.
- For each question include a "why" — one line explaining why this question is coming up for this role and candidate.
- No two questions asking the same thing. No filler.

{extra}{notes_block}
OUTPUT: JSON only, no markdown fences."""


def build_jd_batch_questions_user_prompt(
    *,
    question_count: int,
    include_note_tagging: bool,
    part_index: int | None = None,
    part_total: int | None = None,
) -> str:
    item: dict[str, object] = {
        "question": "string",
        "difficulty": "easy | medium | hard",
        "type": "Technical | Behavioural | System Design | Resume-specific",
        "why": "one line tying this question to the JD and/or resume",
        "source_bullet": "resume substring or null",
    }
    note_rules = ""
    if include_note_tagging:
        item["source_note_section_id"] = "uuid or null"
        item["source_note_section_tag"] = "tag or null"
        note_rules = (
            "\n- When study notes exist in the system prompt, set source_note_section_id / "
            "source_note_section_tag when the question maps to a section."
        )
    return f"""Return a single JSON object with exactly one top-level key: "questions".

The value must be an array of length **exactly {question_count}**. Each element:
{json.dumps(item, indent=2)}

Rules:
- len(questions) MUST be {question_count}.
- Every question must be traceable to the resume, the JD, or the experience level. No generic filler.
- difficulty: easy, medium, or hard (lowercase).
- type: exactly one of Technical, Behavioural, System Design, Resume-specific.
- why: required, one concise line.
- source_bullet: exact resume substring when the question anchors to a bullet, else null.{note_rules}{_batch_part_hint(part_index=part_index, part_total=part_total)}"""


def build_batch_score_system_prompt(
    *,
    resume_text: str,
    role: str,
    question_count: int,
    job_description: str | None = None,
) -> str:
    resume_text, _ = truncate_resume_for_llm(resume_text)
    example_shape = {
        "final_score": 67,
        "one_liner": "short overall roast",
        "per_answer": [
            {
                "n": 1,
                "signal": "yellow",
                "numeric_score": 6,
                "highlight_quote": "verbatim excerpt from their answer",
                "analysis": "3-6 sentences of specific feedback.",
            }
        ],
    }
    upper = question_count
    jd_block = ""
    if job_description and job_description.strip():
        jd_block = f"""
Job description for this interview (weight expectations accordingly):
---
{job_description.strip()}
---
"""
    return f"""You score a finished mock interview: {question_count} question/answer pairs appear in the user message.

Resume (for judging honesty and depth vs claims):
---
{resume_text}
---

Target role: {role}
{jd_block}
Output ONE JSON object only, no markdown. Key names (include all three top-level keys):

{json.dumps(example_shape, indent=2)}

RULES FOR per_answer:
- Must have EXACTLY {question_count} objects, n=1 through n={upper} only, same order as Questions 1-{upper} in the user message.
- signal per entry MUST be exactly one of: green, yellow, red.
  Signal is anchored to TECHNICAL CORRECTNESS OF KNOWLEDGE ONLY.
  Do NOT factor in communication style, phrasing quality, or answer structure.
  - green  = the core technical knowledge is correct. Candidate understands the concept.
             A rambling but correct answer is green.
  - yellow = partially correct. Got the general idea but missed a key mechanism,
             tradeoff, edge case, or number that matters for this role.
  - red    = factually incorrect, or candidate clearly does not understand the concept.
             A polished but wrong answer is red.
- numeric_score: integer 1-10. Score knowledge depth, not communication polish.
  Calibrate: green = 7-10, yellow = 4-7, red = 1-4.
- highlight_quote: verbatim substring from THAT answer's text (25-220 chars ideal), or "" if none.
- analysis: follow this order strictly:
  1. Open with the correctness verdict — exactly one of: "Correct.", "Partially correct.", "Incorrect."
  2. Point to the specific part of their answer that was right or wrong (quote or paraphrase it).
  3. If yellow or red: write "The correct answer is: ..." or "The key concept here is: ..."
     followed by 1-2 sentences of the right approach. The candidate must be able to read
     this feedback and learn the topic — not just know they failed.
  4. Optional: one sentence on communication ONLY if it severely blocked understanding.
     Skip entirely when the underlying knowledge was correct.
  Total length: 3-6 sentences. Correctness first, teach-back second, communication last.

overall final_score: integer 0-100. Base it on knowledge correctness across all answers.
Calibration: roughly 0-35 Cooked, 36-54 Hard, 55-74 Medium, 75+ Raw.
"""


def build_batch_score_user_prompt(*, qa_pairs: list[tuple[str, str]]) -> str:
    blocks: list[str] = []
    for i, (q, a) in enumerate(qa_pairs, start=1):
        blocks.append(f"Question {i}:\n{q}\n\nAnswer {i}:\n{a}\n")
    return "\n---\n".join(blocks)

