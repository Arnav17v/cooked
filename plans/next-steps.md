# Next Steps (you, the human)

Step 0 of the build order is **done in code**. Before Step 1 can start, you need to do a few things the agent can't:

## 1. Free-tier signups (~15 min)

Open accounts and grab API keys / connection strings. Drop them in `backend/.env` (copy `backend/.env.example` first). **Do not commit `.env`.**

| Service | What to grab | Goes into |
| --- | --- | --- |
| [Google AI Studio](https://aistudio.google.com/) | API key | `GEMINI_API_KEY` |
| [Groq Cloud](https://console.groq.com/) | API key | `GROQ_API_KEY` |
| [Railway](https://railway.app/) | Create a Postgres → grab the connection string. **Use the `postgresql+asyncpg://` variant.** | `DATABASE_URL` |
| [Cloudflare R2](https://dash.cloudflare.com/) | Create a bucket → an API token with R2 read/write → S3 endpoint | `R2_*` (four vars) |
| [Render](https://render.com/) | No keys yet — just an account so you can deploy `backend/` later | — |
| [Vercel](https://vercel.com/) | Same — account only; you may already have one | — |
| [Clerk](https://clerk.com/) | Skip until **Step 6**. Don't wire it up now. | — |
| [PostHog](https://posthog.com/) | Skip until **Step 8**. | — |

## 2. Local dev — first run

```bash
# Frontend (one terminal)
cd frontend
npm run dev                        # already verified

# Backend (second terminal)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env               # fill in keys
# Once DATABASE_URL works locally (Railway is fine even for dev):
alembic revision --autogenerate -m "init users resumes analyses questions practice_sessions"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Sanity check:
```bash
curl http://localhost:8000/api/v1/health
# → {"status":"ok"}
```

Every other route currently returns `501` with a pointer to which step in [`tasks.md`](./tasks.md) lights it up. That's expected.

## 3. Lock the score-card visual design

Per [D-010](./decisions.md#d-010-v1-scope-locked-at-3-must-haves-success--screenshot-and-share), this is the viral artifact. **Decide the layout/content/aspect ratio before Step 3 implementation.** Quickest path: paper sketch or Figma frame at 1080x1080 (square) and 1080x1350 (4:5) — those are the screenshot sizes that look best on phone shares.

What goes on the card, minimum:

- The Cooked Score number (huge, dominant)
- Heat label (Easy / Medium / Hard tinted)
- The target role
- A one-line damning headline (the LLM's harshest red flag, in one sentence)
- Brand mark + `amicooked.app` (or whatever the domain ends up being)

## 4. (Optional) Deploy the scaffold

Only after the DB connection works locally:

- **Vercel** → import the repo → set **Root Directory** to `frontend`. Standard Next.js detection handles the rest.
- **Render** → new Web Service → set **Root Directory** to `backend`. Build: `pip install -e .`. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Add `DATABASE_URL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `R2_*`, `ALLOWED_ORIGINS` (= the Vercel preview URL) as env vars on Render.

## Then — start Step 1

[`tasks.md → Step 1`](./tasks.md#step-1--pdf-extraction--postgres-storage): pymupdf integration + the first Alembic migration + `POST /api/v1/resume/upload` + the retention sweep wired up against real rows. The 4000-word cap already lives in `backend/app/services/resume/parser.py:parse_text` — you just need to feed pymupdf output through it for PDFs.
