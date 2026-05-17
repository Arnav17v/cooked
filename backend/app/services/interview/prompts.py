"""System + user prompts for adaptive resume interviews."""

from __future__ import annotations

import json

from app.services.resume.experience_level import experience_level_prompt_block


def build_interview_system_prompt(
    *,
    resume_text: str,
    role: str,
    hard_mode: bool,
    study_notes: list[dict[str, str]] | None = None,
) -> str:
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
    return f"""You write technical interview questions strictly from the candidate's resume below.
The client will show all {question_count} questions at once; the candidate answers offline; an LLM scores later.
Questions must be non-generic: an interviewer with this resume in front of them would ask these.

RESUME:
---
{resume_text}
---

TARGET ROLE: {role}
{exp_block}
{extra}{notes_block}
RULES:
- Mix buckets: from_resume (anchor to a resume bullet), gap (probe a hole), system_design (at most 2-3 if seniority fits).
- Difficulty progression is allowed (start medium, include easy and hard as needed).
- No two questions asking the same thing. No fluff.

OUTPUT: JSON only, no markdown fences."""


def build_batch_questions_user_prompt(*, question_count: int, include_note_tagging: bool) -> str:
    item: dict[str, object] = {
        "question": "string",
        "difficulty": "easy | medium | hard",
        "bucket": "from_resume | gap | system_design",
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
- Vary difficulty and bucket across all questions.{note_rules}"""


def build_batch_score_system_prompt(*, resume_text: str, role: str, question_count: int) -> str:
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
    return f"""You score a finished mock interview: {question_count} question/answer pairs appear in the user message.

Resume (for judging honesty and depth vs claims):
---
{resume_text}
---

Target role: {role}

Output ONE JSON object only, no markdown. Key names (include all three top-level keys):

{json.dumps(example_shape, indent=2)}

RULES FOR per_answer:
- Must have EXACTLY {question_count} objects, n=1 through n={upper} only, same order as Questions 1-{upper} in the user message.
- signal per entry MUST be exactly one of: green, yellow, red.
  - green = strong, concrete, aligned with resume, clear technical or product thinking.
  - yellow = mixed, thin in places, misses a key point, vague, incomplete.
  - red = evasive, hand-wavy, contradicts resume, or clearly weak.
- numeric_score: integer 1-10 per answer (holistic quality for that answer). Calibrate with signal (green tends 7-10, yellow 4-7, red 1-4) but use judgment.
- highlight_quote: verbatim substring from THAT answer's text (25-220 chars ideal), or "" if none.
- analysis: 3-6 sentences tying the question to their answer and the resume.

overall final_score: integer 0-100 holistic score (not a simple average of row colors).
Calibration: roughly 0-35 Cooked, 36-54 Hard, 55-74 Medium, 75+ Raw.
"""


def build_batch_score_user_prompt(*, qa_pairs: list[tuple[str, str]]) -> str:
    blocks: list[str] = []
    for i, (q, a) in enumerate(qa_pairs, start=1):
        blocks.append(f"Question {i}:\n{q}\n\nAnswer {i}:\n{a}\n")
    return "\n---\n".join(blocks)

