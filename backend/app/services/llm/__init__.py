"""LLM boundary.

**The only module tree that may import an LLM SDK** (D-011). Anywhere else
in the codebase importing `google.generativeai`, `groq`, or hitting a model
API directly is a bug.

Public entry point: `app.services.llm.router.LLMRouter`.
"""
