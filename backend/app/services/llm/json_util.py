"""JSON parsing and repair utilities for LLM outputs."""

from __future__ import annotations

import json
import logging
from typing import Any

import json_repair

log = logging.getLogger(__name__)


def parse_and_repair_json(text: str) -> dict[str, Any]:
    """Parse JSON from LLM text, automatically repairing common syntax errors.

    Ensures the parsed root is a dictionary. Raises ValueError if parsing/repair fails.
    """
    cleaned = text.strip()
    if not cleaned:
        raise ValueError("Empty input string")

    # Happy path: Standard JSON parsing
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # Fallback: Attempt to repair the JSON string
    log.warning("Parsing failed, attempting to repair JSON. Raw text: %s", cleaned[:500])
    try:
        repaired = json_repair.repair_json(cleaned, return_objects=True)
        if isinstance(repaired, dict):
            return repaired

        # If repair returned a string representation, parse it
        if isinstance(repaired, str):
            data = json.loads(repaired)
            if isinstance(data, dict):
                return data
    except Exception as e:
        log.error("Failed to repair JSON: %s", e)

    raise ValueError("Invalid JSON format from LLM output, could not repair")
