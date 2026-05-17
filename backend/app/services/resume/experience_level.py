"""Candidate experience level for roast / notes / interview calibration."""

from __future__ import annotations

VALID_EXPERIENCE_LEVELS = frozenset(
    {
        "student",
        "fresher",
        "early",
        "mid",
        "senior",
        "career_switch",
    }
)

_ALIASES: dict[str, str] = {
    "intern": "student",
    "student_intern": "student",
    "new_grad": "fresher",
    "new_graduate": "fresher",
    "entry": "fresher",
    "entry_level": "fresher",
    "junior": "early",
    "early_career": "early",
    "mid_level": "mid",
    "midlevel": "mid",
    "senior_level": "senior",
    "career_switcher": "career_switch",
    "career_changer": "career_switch",
}

_CALIBRATION: dict[str, str] = {
    "student": (
        "Student or intern — little or no full-time experience. Grade on potential, projects, "
        "and coursework. Do not expect years of employment or senior metrics."
    ),
    "fresher": (
        "Fresher / new grad (~0-1 years). Thin work history is normal. Push bullets to be specific "
        "but do not score like a mid-level hire."
    ),
    "early": (
        "Early career (~1-3 years). Expect some shipped work and metrics on recent roles; gaps in "
        "depth are fair game."
    ),
    "mid": (
        "Mid-level (~3-6 years). Expect ownership, impact, and credible metrics on major bullets."
    ),
    "senior": (
        "Senior (~6+ years). Expect scope, leadership signals, and strong outcomes; vague bullets "
        "are serious flags."
    ),
    "career_switch": (
        "Career switcher — limited tenure in this field. Weight transferable projects and recent "
        "learning; flag missing domain depth without assuming years in-role."
    ),
}


def normalize_experience_level(raw: str) -> str:
    key = (raw or "").strip().lower().replace(" ", "_").replace("-", "_")
    key = _ALIASES.get(key, key)
    if key not in VALID_EXPERIENCE_LEVELS:
        raise ValueError(f"invalid experience_level: {raw!r}")
    return key


def experience_level_label(level: str) -> str:
    labels = {
        "student": "Student / intern",
        "fresher": "Fresher (0-1 yr)",
        "early": "Early career (1-3 yr)",
        "mid": "Mid-level (3-6 yr)",
        "senior": "Senior (6+ yr)",
        "career_switch": "Career switcher",
    }
    return labels.get(level, level.replace("_", " ").title())


def experience_level_prompt_block(level: str) -> str:
    norm = normalize_experience_level(level)
    return (
        f"EXPERIENCE LEVEL: {experience_level_label(norm)} ({norm})\n"
        f"CALIBRATION: {_CALIBRATION[norm]}"
    )
