---
name: create-video
description: Use Remotion's create-video CLI to scaffold or work with video-generation projects. Trigger when the user mentions create-video, npx create-video@latest, Remotion templates, adding video generation, rendering videos, motion graphics, Remotion Player, or a repo-local video project.
---

# Create Video

Use this skill when adding or working with Remotion video-generation code from this workspace.

## First Checks

- Treat `create-video` as a scaffold generator, not a normal dependency to add to `frontend/package.json`.
- Read the repo's project docs first. For `cooked`, do not wire video generation into the production app unless the user explicitly asks for that product change.
- Prefer a separate repo folder such as `video/`, `remotion/`, or the user-specified directory. Avoid generating a second app directly into the repo root or into `frontend/` without explicit approval.
- Check `git status --short` before scaffolding and preserve unrelated user changes.

## Scaffold Workflow

1. Confirm or choose the target directory and template.
2. Use a non-interactive command whenever possible:

```bash
npx create-video@latest --yes --blank video
```

3. Replace `--blank` with another template flag when the user requests it.
4. For templates that allow Tailwind but should stay plain, add `--no-tailwind`.
5. After scaffolding, run the generated project's install command from that new directory, then run its lint/build/dev command only if needed for the user's task.

## Known CLI Behavior

- `--yes` requires both a template flag and a directory, for example `--yes --blank video`.
- Template flags are boolean options named after the template's `cliId`, such as `--blank`, `--hello-world`, `--next`, `--vercel`, `--render-server`, `--three`, `--still`, `--audiogram`, `--prompt-to-video`, and `--code-hike`.
- Running `npx create-video@latest --help` may open the interactive template picker instead of printing help.
- The generator detects the package manager from the runner: `npx` leads to npm commands, `pnpm dlx` leads to pnpm commands, and so on.
- When run inside an existing Git repo without `--yes`, it prompts before continuing. With `--yes`, it skips that prompt and creates the project without initializing a nested Git repo.

## Cooked Repo Defaults

- Default directory: `video/`.
- Default template for quick custom motion work: `--blank`.
- Use `--next` only if the requested output is a standalone video-generation SaaS app. The main Cooked frontend is already a Next.js app, so do not scaffold this inside `frontend/` unless explicitly directed.
- Avoid `--prompt-to-video` for v1 product work unless the user confirms paid or third-party media APIs are acceptable; the Cooked v1 guardrails are free-tier only.

## References

- Read `references/create-video-cli.md` when you need the current template list, package metadata, or command examples.
