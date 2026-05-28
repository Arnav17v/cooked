"""Context manager for dev LLM trace binding."""

from __future__ import annotations

from typing import Any

from app.services.llm import dev_trace as dt


class llm_dev_trace:
    """Bind ``key`` before LLM calls; collect events for SSE or API responses.

    ``retain_buffer=True`` keeps events in the in-memory buffer (for analysis SSE).
    """

    def __init__(self, key: str, *, retain_buffer: bool = False) -> None:
        self.key = key
        self.retain_buffer = retain_buffer
        self.events: list[dict[str, Any]] = []

    def __enter__(self) -> llm_dev_trace:
        dt.bind_llm_dev_trace(self.key)
        return self

    def __exit__(self, *_exc: object) -> None:
        if self.retain_buffer:
            self.events = dt.snapshot_llm_dev_trace(self.key)
            return
        self.events = dt.unbind_llm_dev_trace()
