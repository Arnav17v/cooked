# Database Schema

PostgreSQL on Railway. All schema changes go through **Alembic migrations** — see [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer). Never run `ALTER TABLE` manually in production.

## Tables (v1)

### `users`

```sql
users
  id                   uuid PK
  email                varchar unique
  plan                 varchar default 'free'
  analyses_today       integer default 0
  last_analysis_date   date
  created_at           timestamp default now()
```

Rate-limit state lives directly on the row: when an analysis is requested, the backend checks `analyses_today` and `last_analysis_date`, resets if the date rolled over, and rejects if the day's count is at the cap (3 per [D-011](./decisions.md#d-011-backend--infra-stack-fastapi--postgres--r2--clerk--posthog)). **Enforced at DB level before any LLM call.**

### `resumes`

```sql
resumes
  id                    uuid PK
  user_id               uuid FK → users.id
  raw_text              text nullable           -- 4000 word cap; NULLed by retention sweeper after 24h
  file_url              varchar nullable        -- R2 object URL; nullable for paste; also cleared by sweeper
  target_role           varchar
  created_at            timestamp default now()
  raw_text_deleted_at   timestamp nullable      -- set by the daily APScheduler job — see D-015
```

The 4000-word cap is enforced **in `services/resume/parser.py`**, before storage. No truncation surprises happen inside the LLM layer.

**Retention** (locked by [D-015](./decisions.md#d-015-24-hour-raw-resume-text-retention--apscheduler-cleanup)):

- After 24h, an APScheduler job in FastAPI:
  1. Nulls `raw_text` for any `resumes` row where `created_at < now() - 24h` and `raw_text_deleted_at IS NULL`.
  2. Deletes the matching PDF object from R2 (if `file_url` is set).
  3. Stamps `raw_text_deleted_at = now()`.
- `analyses`, `questions`, and `practice_sessions` rows are **kept forever** — they hold the value the user comes back to read and share.
- Privacy copy users see: *"We delete your resume text within 24 hours. We keep only the analysis."*

### `analyses`

```sql
analyses
  id                 uuid PK
  resume_id          uuid FK → resumes.id
  share_slug         varchar unique          -- public-facing slug, NEVER the UUID
  cooked_score       integer
  score_breakdown    jsonb
  red_flags          jsonb
  rewritten_bullets  jsonb
  prompt_version     varchar                 -- e.g. "roast-v1.0", "roast-v1.1"
  status             varchar                 -- 'pending' | 'processing' | 'done' | 'failed'
  created_at         timestamp default now()
```

- `share_slug`: random, URL-safe, separate from `id`. Public share URLs (`/share/[slug]`) use this — internal UUIDs are never exposed.
- `prompt_version`: every row records which prompt generated it. Lets us A/B prompts safely, debug regressions, and avoid mixing outputs from incompatible prompts.
- `score_breakdown`, `red_flags`, `rewritten_bullets`: **all `jsonb`**. This is the evolution buffer — see [jsonb as safety net](#jsonb-columns-are-the-evolution-buffer).

### `questions`

```sql
questions
  id              uuid PK
  analysis_id     uuid FK → analyses.id
  question        text
  category        varchar       -- 'behavioral' | 'technical' | 'project'
  source_bullet   text          -- the exact resume bullet this question came from
  difficulty      varchar       -- 'Easy' | 'Medium' | 'Hard'
```

`source_bullet` is the audit trail for "this isn't a generic question, here's the exact line it came from."

### `practice_sessions`

```sql
practice_sessions
  id            uuid PK
  user_id       uuid FK → users.id
  question_id   uuid FK → questions.id
  user_answer   text
  feedback      jsonb
  created_at    timestamp default now()
```

`feedback` is `jsonb` so the structure can evolve from v1's "plain prose" to v2's structured rubric without breaking old rows.

## Schema evolution rules

Locked by [D-012](./decisions.md#d-012-alembic-migrations--jsonb-as-evolution-buffer).

### Safe to do anytime

- **Add a new table.**
- **Add a new column with a default value.** Existing rows get the default.
- **Add an index.**
- **Add an FK to a new table.**

```sql
-- safe examples
ALTER TABLE analyses ADD COLUMN ai_replace_score integer DEFAULT 0;
ALTER TABLE users    ADD COLUMN subscription_id varchar;
CREATE TABLE flashcards (...);
```

### Dangerous — write a migration carefully, deploy in stages

- **Renaming a column** — backend code referencing the old name crashes instantly. Two-step migration: add new column → backfill → switch code → drop old column.
- **Dropping a column** — data is gone forever. Confirm before doing.
- **Changing a column type** — can corrupt existing data. Use a new column + backfill pattern.
- **Adding `NOT NULL` with no default** — breaks all existing rows. Add nullable first, backfill, then add `NOT NULL`.

### Workflow

```bash
# in backend/
alembic revision --autogenerate -m "add ai_replace_score to analyses"
# review the generated migration; autogenerate is helpful, not infallible
alembic upgrade head        # local + staging + prod, in that order
```

Never edit the DB manually in production. The migration history is the source of truth — it is also the rollback plan.

### `jsonb` columns are the evolution buffer

`score_breakdown`, `red_flags`, `rewritten_bullets`, `feedback` are intentionally `jsonb` rather than rigid columns because the LLM's output shape will evolve. When the prompt changes:

- Old rows keep the old shape.
- New rows get the new shape.
- Both query fine.
- `prompt_version` tells you which shape to expect when reading.

Do not "fix" this by normalising the jsonb into columns — that flexibility is the whole point.

## v2 / v3 examples (illustrative, not committed)

```sql
-- v2: reintroduce flashcards
CREATE TABLE flashcards (
  id           uuid PK,
  analysis_id  uuid FK → analyses.id,
  front        text,
  back         text,
  created_at   timestamp default now()
);
ALTER TABLE analyses ADD COLUMN flashcards_generated boolean DEFAULT false;

-- v2: community surface
CREATE TABLE resume_posts (...);
CREATE TABLE comments (...);

-- v3: paid subscription
ALTER TABLE users ADD COLUMN stripe_customer_id varchar;
ALTER TABLE users ADD COLUMN plan_expires_at   timestamp;
```

None of these touch existing data — they add new structure alongside it.

## One rule to follow

**Always write a migration. Never edit the database by hand in production.** Do that and schema evolution is boring and safe.
