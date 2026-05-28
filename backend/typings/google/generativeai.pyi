"""Minimal stubs for ``google-generativeai`` (package ships without py.typed)."""

from typing import Any

def configure(*, api_key: str, **kwargs: Any) -> None: ...

class GenerativeModel:
    def __init__(
        self,
        model_name: str,
        *,
        system_instruction: str | None = ...,
    ) -> None: ...
    def generate_content(
        self,
        contents: str,
        *,
        generation_config: dict[str, Any] | None = ...,
    ) -> GenerateContentResponse: ...

class GenerateContentResponse:
    text: str | None
