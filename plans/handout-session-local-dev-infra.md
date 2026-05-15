# Handout — local dev & infra (this session)

Quick reference for Postgres, object storage, env vars, and running the backend. **Do not put real keys or passwords in this file.**

---

## Postgres (Railway)

| URL type | Host example | Use |
|----------|----------------|-----|
| **Private** | `postgres.railway.internal` | Only between services **inside** the same Railway project. |
| **Public** | `*.proxy.rlwy.net` + non‑5432 port | Laptop, Render, anything **outside** Railway’s private network. |

- App uses **async SQLAlchemy + asyncpg**. Set:

  `DATABASE_URL=postgresql+asyncpg://...`

  (not plain `postgresql://`).

- If credentials were ever pasted in chat or a ticket, **rotate** them in Railway.

---

## LLM providers (v1 product)

- **Planned stack:** Gemini (analyze + questions), Groq (evaluate + feedback). See `plans/decisions.md` (D-009).
- **xAI / Grok** is **not** in the v1 router; separate billing and console.
- To limit surprise API spend on any provider: use official **Billing / Usage** docs, keep **postpay limits at $0** if you only want prepaid quotas, and **never** commit API keys.

---

## Object storage

### Cloudflare R2

- R2 **free tier** still requires a **payment method on file** for activation.
- If the card is rejected (`This card type isn't accepted`), try **Visa/Mastercard** with international e‑commerce, **PayPal**, or **Apple/Google Pay** — or contact Cloudflare **billing** support.

### Backblaze B2 (S3-compatible)

Works with the same boto3 code as R2; env vars are still named `R2_*`.

- **Bucket:** e.g. private, encryption on, **Object Lock off** (you delete PDFs after ~24h).
- **Application Key:** scoped to that bucket; copy **keyID** + **applicationKey** (secret shown **once**).
- **Endpoint:** from B2 UI, e.g. `https://s3.<region>.backblazeb2.com`.
- **Region:** e.g. `eu-central-003` — use the value B2 shows for S3; set `R2_REGION` (not `auto` unless you’re on Cloudflare R2).

### Local fallback

- **MinIO** (Docker) + same `R2_*` vars; for MinIO often `R2_REGION=us-east-1`.
- Production (Render) needs a **public** S3 endpoint, not `localhost`.

---

## `backend/.env` (shape only)

Copy from `backend/.env.example`, then fill:

- `DATABASE_URL` — Railway public + `postgresql+asyncpg://`
- `GEMINI_API_KEY`, `GROQ_API_KEY`
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_REGION` (B2 or R2)
- `ALLOWED_ORIGINS` — e.g. `http://localhost:3000` until the frontend URL changes

**Never commit** `.env`.

---

## First migration & API

From `backend/` (with venv activated):

```bash
pip install -e ".[dev]"
alembic revision --autogenerate -m "init users resumes analyses questions practice_sessions"   # once
alembic upgrade head
curl http://localhost:8000/api/v1/health
```

Expect `{"status":"ok"}`. Other routes may return `501` until later **tasks.md** steps.

---

## Uvicorn + `ModuleNotFoundError` (e.g. `apscheduler`)

Dependencies install into **`backend/.venv`**. If the traceback shows **`/Library/Frameworks/`** (system Python), **uvicorn** is not the venv one.

- Run: `which uvicorn` → should be under `backend/.venv/bin`.
- Or explicitly:

  ```bash
  .venv/bin/uvicorn app.main:app --reload --port 8000
  # or
  .venv/bin/python -m uvicorn app.main:app --reload --port 8000
  ```

---

## Frontend dev server

If **3000** is busy, Next.js picks **3001**, **3002**, etc. Open the URL printed in the terminal.

---

## What’s next in the repo

After DB + health work: **Step 1** in `plans/tasks.md` (PDF upload, B2/R2 storage, retention sweep, real routes). Design lock for the score card: `plans/next-steps.md`.

---

## Code note (this repo)

- `R2_REGION` in `backend/app/core/config.py` defaults to **`auto`** (Cloudflare R2). Override for **B2** or **MinIO**.
