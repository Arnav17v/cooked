# /plans — Project Knowledge Base

Persistent shared context for all future AI agents and human developers working on **Am I Cooked?**.

Treat this folder as **living documentation**. Before editing the codebase, read the relevant file(s) here. After making meaningful changes, update them.

> **Companion files** outside this folder also govern agent behaviour:
> - [`/AGENTS.md`](../AGENTS.md) — root-level index that every agent reads first.
> - [`/.cursor/rules/*.mdc`](../.cursor/rules/) — Cursor auto-loads these on every prompt. They encode the same rules as this folder in shorter, scope-tagged form. Keep them in sync.

## File index

| File | Purpose |
| --- | --- |
| [`project-overview.md`](./project-overview.md) | What the product is, who it's for, the value prop, and the "feel". |
| [`architecture.md`](./architecture.md) | Tech stack, repo layout, runtime model, component boundaries, API surface. |
| [`infra.md`](./infra.md) | Deployment / services map, costs, env vars, free-tier limits, cold-start handling. |
| [`database-schema.md`](./database-schema.md) | Postgres tables, Alembic workflow, safe-vs-dangerous schema ops, jsonb evolution buffer. |
| [`design-system.md`](./design-system.md) | LeetCode-inspired visual language (colors, typography, tokens, patterns). |
| [`current-goals.md`](./current-goals.md) | What we are focused on **right now** and the definition of done. |
| [`roadmap.md`](./roadmap.md) | Full feature roadmap with scope phases: Build first / Monetize next / Later bets. |
| [`tasks.md`](./tasks.md) | The 8-step v1 build order. Concrete, sequenced next actions. |
| [`next-steps.md`](./next-steps.md) | **Human actions** required before Step 1 — signups, env file, score-card design. |
| [`decisions.md`](./decisions.md) | ADR-style log of product + technical decisions and the reasoning. |
| [`setup.md`](./setup.md) | How to install, run, build, and debug locally (both frontend and backend). |
| [`known-issues.md`](./known-issues.md) | Bugs, gaps, anti-features, scope risks, open questions. |
| [`changelog.md`](./changelog.md) | Chronological log of meaningful changes. |
| [`agent-instructions.md`](./agent-instructions.md) | Rules of engagement for AI agents touching this repo. |

## How to use this folder

- **Onboarding (humans or agents):** read `project-overview.md` → `architecture.md` → `infra.md` → `current-goals.md` → `tasks.md`.
- **Before coding:** check `decisions.md` for prior rulings on the area you are about to touch. Check `known-issues.md` for traps.
- **Touching the DB?** read `database-schema.md` first. **No manual `ALTER TABLE`** — always Alembic.
- **Touching the backend or infra?** read `infra.md` first for env vars, services, deploy expectations.
- **When making a non-trivial change:** add an entry to `changelog.md` and, if it sets a precedent, to `decisions.md`.
- **When scope changes:** update `current-goals.md` and `roadmap.md`. Keep `tasks.md` in sync.
- **When something breaks or is intentionally unfinished:** record it in `known-issues.md`.

## Conventions

- Markdown-first. No diagrams that require external tooling.
- Bullet points over prose. High signal, low fluff.
- Cross-link with relative paths (e.g. `[decisions](./decisions.md#d-002)`).
- ASCII only. No emoji unless the user explicitly asks.
- If unsure, **prefer questions over assumptions** — add them under a `## Open questions` section in the relevant file rather than guessing.
