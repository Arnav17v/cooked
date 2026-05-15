"""LLM recoverable failures — trigger cross-vendor failover in `router.py`."""


from __future__ import annotations


class RecoverableLLMError(Exception):
    """Raised on HTTP 429/5xx, timeouts, or empty model output."""

    def __init__(self, message: str, *, raw_response: str | None = None) -> None:
        super().__init__(message)
        self.raw_response = raw_response
