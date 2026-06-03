export function clampResumeScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function scoreHeatColor(heat: string): string {
  const h = heat.toLowerCase();
  if (h === "raw" || h === "easy") return "#00b8a3";
  if (h === "medium") return "#ffc01e";
  if (h === "hard") return "#ff8c42";
  if (h === "cooked") return "#ef4743";
  return "#ffc01e";
}

export function formatHeatLabel(heat: string | null | undefined): string {
  const t = (heat ?? "Medium").trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Per-dimension bar: blue (strong), yellow (ok), red (weak) by % of max. */
export function dimensionScoreColor(score: number, max: number): string {
  if (max <= 0) return "#ffc01e";
  const pct = (100 * score) / max;
  if (pct >= 75) return "#4da3ff";
  if (pct >= 50) return "#ffc01e";
  return "#ef4743";
}
