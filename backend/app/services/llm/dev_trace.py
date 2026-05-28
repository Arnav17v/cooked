"""Dev-only LLM fallback trace — ``DEV=1`` in backend ``.env``.

Bind a trace key before LLM work; ``emit_llm_dev_event`` appends events the SSE
handler or API response can surface as frontend toasts.
"""

from __future__ import annotations

import contextvars
from typing import Any

from app.core.config import get_settings

_trace_key: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "llm_dev_trace_key", default=None
)
_buffers: dict[str, list[dict[str, Any]]] = {}


def bind_llm_dev_trace(key: str) -> None:
    if not get_settings().dev:
        return
    _buffers[key] = []
    _trace_key.set(key)


def clear_llm_dev_trace(key: str) -> None:
    _buffers.pop(key, None)
    if _trace_key.get() == key:
        _trace_key.set(None)


def unbind_llm_dev_trace() -> list[dict[str, Any]]:
    key = _trace_key.get()
    _trace_key.set(None)
    if not key:
        return []
    return _buffers.pop(key, [])


def emit_llm_dev_event(*, kind: str, task: str | None = None, **fields: Any) -> None:
    if not get_settings().dev:
        return
    key = _trace_key.get()
    if not key:
        return
    buf = _buffers.get(key)
    if buf is None:
        return
    evt: dict[str, Any] = {"kind": kind}
    if task:
        evt["task"] = task
    for k, v in fields.items():
        if v is not None:
            evt[k] = v
    buf.append(evt)


def snapshot_llm_dev_trace(key: str) -> list[dict[str, Any]]:
    return list(_buffers.get(key, []))


def drain_llm_dev_events(key: str, since: int) -> tuple[list[dict[str, Any]], int]:
    buf = _buffers.get(key, [])
    if since >= len(buf):
        return [], since
    chunk = buf[since:]
    return chunk, since + len(chunk)
