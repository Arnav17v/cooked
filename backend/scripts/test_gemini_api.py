#!/usr/bin/env python3
"""Smoke-test Google Generative Language API (Gemini / Gemma).

Run from the backend directory:

    cd backend && .venv/bin/python scripts/test_gemini_api.py

Uses `GEMINI_API_KEY` and `GEMINI_MODEL` from `.env` (same as the FastAPI app).
"""

from __future__ import annotations


def _canonical_model_id(raw: str) -> str:
    m = raw.strip()
    if not m:
        return m
    if m.startswith("models/"):
        return m
    if m.lower().startswith("gemma-"):
        return f"models/{m}"
    return m


def main() -> None:
    import google.generativeai as genai

    from app.core.config import get_settings

    settings = get_settings()
    key = settings.gemini_api_key
    raw = settings.gemini_model.strip()

    print("=== Gemini API smoke test ===")
    if not key:
        raise SystemExit("GEMINI_API_KEY is missing — set it in backend/.env")

    mid = _canonical_model_id(raw)
    if not mid:
        raise SystemExit("GEMINI_MODEL is empty")

    print(f"GEMINI_MODEL (env): {raw!r}")
    print(f"Calling API as:       {mid!r}")

    genai.configure(api_key=key)
    model = genai.GenerativeModel(mid)

    prompt = (
        "In exactly one sentence, describe a fictional breakfast cereal. "
        'End your reply with a single JSON object on its own line: '
        '{"cereal_name": "<short string>", "weirdness": <integer 1-10>}'
    )

    gen_kw: dict[str, object] = {"temperature": 0.4, "max_output_tokens": 512}

    try:
        resp = model.generate_content(prompt, generation_config=gen_kw)
    except Exception as e:
        print("\n❌ Request failed:")
        print(type(e).__name__, str(e))
        raise SystemExit(2) from e

    text = (getattr(resp, "text", None) or "").strip()
    print("\n✅ Response text:")
    print(text if text else "(empty)")

    cand = resp.candidates[0] if resp.candidates else None
    fr = getattr(cand, "finish_reason", None) if cand else None
    print(f"\nfinish_reason: {fr!r}")


if __name__ == "__main__":
    main()
