# Design System — LeetCode-Inspired Dark

The whole app uses a LeetCode-flavored dark UI. The goal is "serious tool for builders with a fun wrapper", not "playful pastel SaaS landing page".

## Core principles

1. **Dark by default.** No light mode for now.
2. **One brand accent** — LeetCode orange `#ffa116`. Used sparingly for primary CTAs, brand mark, hover/focus, and the `// comment` section eyebrows.
3. **Difficulty colors are semantic.** Green = Easy/strength/safe. Yellow = Medium/warning. Red = Hard/red-flag/risk. Use them anywhere severity is being communicated.
4. **Mono for "code-flavored" affordances.** Filenames, scores, question numbers (`Q.01`), `// comment` labels, elo numbers, stage tags.
5. **Tight density.** LeetCode's UI is compact. Default text is `13–14px`, not `16px`.
6. **Card chrome.** Most surfaces are bordered, not shadowed. Hover state often lights the border to `lc-orange/40`.

## Color tokens

Defined in `tailwind.config.ts` under `colors.lc.*`. Use these names — do **not** hardcode hex in components except for the difficulty triple which is also used inline by the `DifficultyPill` style map.

| Token | Hex | Role |
| --- | --- | --- |
| `lc-bg` | `#1a1a1a` | App background |
| `lc-header` | `#0f0f0f` | Sticky nav, alt section backgrounds (banded contrast) |
| `lc-surface` | `#282828` | Default card surface |
| `lc-elevated` | `#303030` | Inputs, inner panels, hover state |
| `lc-border` | `#3e3e3e` | Default border |
| `lc-divider` | `rgba(255,255,255,0.08)` | Subtle dividers |
| `lc-text` | `#eff2f6` | Primary text |
| `lc-muted` | `#b3b3b3` | Body / secondary text |
| `lc-dim` | `#808080` | Meta, captions, mono labels |
| `lc-orange` | `#ffa116` | Brand accent |
| `lc-orangeHover` | `#ffb13a` | CTA hover |
| `lc-easy` | `#00b8a3` | Easy / strength / safe |
| `lc-medium` | `#ffc01e` | Medium / warning |
| `lc-hard` | `#ef4743` | Hard / red flag |
| `lc-blue` | `#4dabf7` | Reserved (info, links) |

## Typography

- UI: `Inter` via `next/font/google`, attached as `--font-inter`.
- Mono: `JetBrains Mono` via `next/font/google`, attached as `--font-jetbrains`.
- Tailwind has `font-sans` (Inter) and `font-mono` (JetBrains) wired in `tailwind.config.ts`.

### When to use mono

- Filenames (`resume.txt`, `cooked-score.tsx`, `user_stats.json`)
- Scores (`68 / 100`)
- Question numbers (`Q.01`, `Q.02`)
- Problem numbers (`001`, `002`)
- Section eyebrows (`// roadmap`, `// pricing`, `// signals`)
- Status lines (`status: ready`)
- Tabular numerics — pair with `tabular-nums`

## Recurring patterns

### Section eyebrow

```tsx
<p className="font-mono text-[12px] uppercase tracking-wider text-lc-orange">
  // section name
</p>
```

### Difficulty pill

Already implemented as `DifficultyPill` in both `src/app/page.tsx` and `src/components/resume-roast-demo.tsx`. **If a third file needs it, extract to `src/components/ui/difficulty-pill.tsx`** instead of copying again.

### "Editor pane" card

Bordered card with a small dark header bar containing:
- Left: lucide icon + monospace filename
- Right: three small traffic-light dots (`bg-lc-hard/70`, `bg-lc-medium/70`, `bg-lc-easy/70`)

Used for the cooked-score preview, the resume roast input pane, and the output console.

### Problem-list table (roadmap)

5-column grid: `[40px_60px_1fr_140px_120px]` — status icon, mono number, title + description, stage tag, difficulty pill.

### Primary CTA

```tsx
<a className="bg-lc-orange hover:bg-lc-orangeHover text-black font-semibold rounded-md px-... py-...">
```

Always **black text on orange**, never white.

### Secondary CTA

```tsx
<a className="border border-lc-border bg-lc-surface hover:bg-lc-elevated text-lc-text">
```

## Anti-patterns

- Do not introduce a new brand color. Re-use `lc-orange` or one of the difficulty colors.
- Do not use white CTAs on the dark surface.
- Do not use shadows for depth — use bordered surfaces. (Featured pricing card is the one exception, with a subtle orange-tinted glow.)
- Do not use emoji or decorative SVGs unless asked.
- Do not use playful rounded-full pills for everything — that's the old beige design. Stick to `rounded-md` for cards, `rounded-full` only for status pills/dots.
