"""Score derivation helpers.

Pure-Python utilities for transforming the LLM's structured output into the
final `cooked_score` integer and `score_breakdown` jsonb shape. Wired at
Step 2.
"""

from __future__ import annotations
