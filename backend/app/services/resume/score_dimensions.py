"""Multi-dimensional Resume Score — normalize, derive totals, backward compat."""

from __future__ import annotations

from typing import Any

# Four dimensions (95 pts on bars; total still shown as /100). Ready removed — folded into Job Match.
DIMENSION_MAX: dict[str, int] = {
    "ats": 20,
    "content": 40,
    "writing": 10,
    "job_match": 25,
}

_DIMENSION_ORDER = ("ats", "content", "writing", "job_match")

# Intermediate caps (2026-06 D-019) — migrated on read
_D019_MAX: dict[str, int] = {
    "ats": 15,
    "content": 45,
    "writing": 10,
    "job_match": 30,
}

_LEGACY_FIVE_MAX: dict[str, int] = {
    "ats": 20,
    "content": 40,
    "writing": 10,
    "job_match": 25,
    "ready": 5,
}


def _clamp_dim(key: str, value: object) -> int:
    cap = DIMENSION_MAX[key]
    try:
        n = int(float(value))
    except (TypeError, ValueError):
        n = 0
    return max(0, min(cap, n))


def empty_dimensions() -> dict[str, int]:
    return {k: 0 for k in _DIMENSION_ORDER}


def total_from_dimensions(dims: dict[str, int]) -> int:
    return sum(dims.get(k, 0) for k in _DIMENSION_ORDER)


def derive_dimensions_from_total(score: int) -> dict[str, int]:
    """Approximate breakdown for analyses that only stored one number."""
    s = max(0, min(100, int(score)))
    if s <= 0:
        return empty_dimensions()
    ratios = [20, 40, 10, 25]
    raw = [s * r / 100 for r in ratios]
    ints = [int(x) for x in raw]
    remainder = s - sum(ints)
    idx = 1 if len(ints) > 1 else 0
    ints[idx] = min(DIMENSION_MAX["content"], ints[idx] + remainder)
    remainder = s - sum(ints)
    if remainder > 0:
        ints[3] = min(DIMENSION_MAX["job_match"], ints[3] + remainder)
    remainder = s - sum(ints)
    if remainder > 0:
        ints[0] = min(DIMENSION_MAX["ats"], ints[0] + remainder)
    return {
        "ats": ints[0],
        "content": ints[1],
        "writing": ints[2],
        "job_match": ints[3],
    }


def _scale_legacy_dim(score: int, old_max: int, new_max: int) -> int:
    if old_max <= 0:
        return 0
    return max(0, min(new_max, round(score * new_max / old_max)))


def _looks_like_d019_caps(raw: dict[str, Any]) -> bool:
    if "ready" in raw:
        return False
    try:
        ats = int(float(raw.get("ats") or 0))
        content = int(float(raw.get("content") or 0))
        job_match = int(float(raw.get("job_match") or 0))
    except (TypeError, ValueError):
        return False
    return ats <= _D019_MAX["ats"] and content <= _D019_MAX["content"] and job_match <= _D019_MAX["job_match"]


def _migrate_d019_four_dim(raw: dict[str, Any]) -> dict[str, int]:
    ats = int(float(raw.get("ats") or 0))
    content = int(float(raw.get("content") or 0))
    writing = int(float(raw.get("writing") or 0))
    job_match = int(float(raw.get("job_match") or 0))
    return {
        "ats": _scale_legacy_dim(ats, _D019_MAX["ats"], DIMENSION_MAX["ats"]),
        "content": _scale_legacy_dim(content, _D019_MAX["content"], DIMENSION_MAX["content"]),
        "writing": _scale_legacy_dim(writing, _D019_MAX["writing"], DIMENSION_MAX["writing"]),
        "job_match": _scale_legacy_dim(job_match, _D019_MAX["job_match"], DIMENSION_MAX["job_match"]),
    }


def _migrate_legacy_five_dim(raw: dict[str, Any]) -> dict[str, int]:
    """Map five-dim breakdown (incl. ready) onto four-dim caps."""
    ats = int(float(raw.get("ats") or 0))
    content = int(float(raw.get("content") or 0))
    writing = int(float(raw.get("writing") or 0))
    job_match = int(float(raw.get("job_match") or 0)) + int(float(raw.get("ready") or 0))
    return {
        "ats": _scale_legacy_dim(ats, _LEGACY_FIVE_MAX["ats"], DIMENSION_MAX["ats"]),
        "content": _scale_legacy_dim(content, _LEGACY_FIVE_MAX["content"], DIMENSION_MAX["content"]),
        "writing": _scale_legacy_dim(writing, _LEGACY_FIVE_MAX["writing"], DIMENSION_MAX["writing"]),
        "job_match": _scale_legacy_dim(
            job_match,
            _LEGACY_FIVE_MAX["job_match"] + _LEGACY_FIVE_MAX["ready"],
            DIMENSION_MAX["job_match"],
        ),
    }


def normalize_score_dimensions(
    raw: object,
    *,
    fallback_total: int | None = None,
) -> dict[str, int]:
    """Return a full dimension map; derive from total when LLM omitted dimensions."""
    if isinstance(raw, dict):
        if "ready" in raw:
            migrated = _migrate_legacy_five_dim(raw)
            if total_from_dimensions(migrated) > 0:
                return migrated
        if _looks_like_d019_caps(raw):
            migrated = _migrate_d019_four_dim(raw)
            if total_from_dimensions(migrated) > 0:
                return migrated
        dims = {k: _clamp_dim(k, raw.get(k)) for k in _DIMENSION_ORDER}
        if total_from_dimensions(dims) > 0:
            return dims
    if fallback_total is not None:
        return derive_dimensions_from_total(fallback_total)
    return empty_dimensions()


def dimensions_from_breakdown(breakdown: dict[str, Any] | None) -> dict[str, int]:
    if not breakdown:
        return empty_dimensions()
    raw = breakdown.get("score_dimensions")
    total = breakdown.get("total_score")
    if total is None and isinstance(breakdown.get("score"), (int, float)):
        total = int(breakdown["score"])
    fb: int | None = None
    if isinstance(total, (int, float)):
        fb = int(total)
    return normalize_score_dimensions(raw, fallback_total=fb)


def public_dimensions_payload(dims: dict[str, int]) -> dict[str, object]:
    """API-safe dimension map with max labels."""
    total = total_from_dimensions(dims)
    return {
        "ats": {"score": dims["ats"], "max": DIMENSION_MAX["ats"]},
        "content": {"score": dims["content"], "max": DIMENSION_MAX["content"]},
        "writing": {"score": dims["writing"], "max": DIMENSION_MAX["writing"]},
        "job_match": {"score": dims["job_match"], "max": DIMENSION_MAX["job_match"]},
        "ready": {"score": 0, "max": 0},
        "total": total,
        "total_max": 100,
    }
