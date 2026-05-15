"""Answer evaluator (stretch v1, required v2).

Plain-prose feedback in v1 - no rubric scoring (D-010). Calls `LLMRouter`
with `task="feedback"` (Groq primary per D-009). Wired only if Steps 0-8
finish with time to spare.
"""

from __future__ import annotations
