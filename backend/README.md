# backend

FastAPI service for **Am I Cooked?**. See [`../plans/architecture.md`](../plans/architecture.md) and [`../plans/infra.md`](../plans/infra.md) for the full picture.

## Local dev

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env             # fill in keys
alembic revision --autogenerate -m "init"   # generates the first migration (Step 1)
alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

Use **`python -m uvicorn`** (after `activate`) so the server always runs on the same interpreter as `pip install`. If `which uvicorn` points at `/Library/Frameworks/...` or anything outside `.venv`, plain `uvicorn ...` can spawn workers without `sqlalchemy` / `apscheduler` installed.

Health probe: `curl http://localhost:8000/api/v1/health`.

## Tree

```
backend/
├── alembic.ini
├── pyproject.toml
├── .env.example
└── app/
    ├── main.py                  # FastAPI app + CORS + lifespan (APScheduler)
    ├── core/
    │   ├── config.py            # pydantic-settings
    │   ├── scheduler.py         # APScheduler (D-015)
    │   ├── security.py          # Clerk JWT (stubbed pre-Step-6)
    │   └── storage.py           # R2 client (S3-compatible)
    ├── db/
    │   ├── session.py           # async SQLAlchemy
    │   └── migrations/          # Alembic (D-012)
    ├── models/                  # users, resumes, analyses, questions, practice_sessions
    ├── services/
    │   ├── llm/                 # router + gemini + groq — single LLM boundary (D-011)
    │   ├── resume/              # parser (pymupdf, 4000-word cap), analyzer, scorer, retention
    │   └── questions/           # generator, evaluator
    └── api/v1/                  # routes/ + router.py aggregator
```

## Hard rules

- **All LLM calls go through `services/llm/router.py`.** No SDK imports anywhere else.
- **No Redis, no Celery.** `BackgroundTasks` + SSE + APScheduler only.
- **All schema changes are Alembic migrations.** No manual `ALTER TABLE`.
- **Never expose `id` in public URLs.** Use `share_slug`.
- **3 analyses/user/day** enforced in code before the LLM call.
- **4000-word cap** enforced in `parser.py` before storage.
- **Raw resume text deleted after 24h** by the retention sweep.

See [`../.cursor/rules/backend.mdc`](../.cursor/rules/backend.mdc) and [`../plans/`](../plans/).
