import { clampCookedScore, getScoreMemeSrc } from "@/lib/score-meme";

export type ScoreCardProps = {
  cookedScore: number;
  heatLabel: string;
  headline?: string | null;
  /** When omitted or empty, role line is hidden (tighter verdict panel). */
  targetRole?: string | null;
  degraded?: boolean;
  /** When false, omit branding/footer for compact panels */
  showFooter?: boolean;
  /** When false, hide the target role line under the headline */
  showTargetRole?: boolean;
  /** When false, hide the small "Cooked Score" caption above the number */
  showScoreLabel?: boolean;
  /** When false, hide the tier meme image */
  showMeme?: boolean;
};

export function scoreHeatColor(heat: string): string {
  const h = heat.toLowerCase();
  if (h === "raw" || h === "easy") return "#00b8a3";
  if (h === "medium") return "#ffc01e";
  if (h === "hard") return "#ff8c42";
  if (h === "cooked") return "#ef4743";
  return "#ffc01e";
}

export function ScoreCard({
  cookedScore,
  heatLabel,
  headline,
  targetRole,
  degraded,
  showFooter = true,
  showTargetRole = true,
  showScoreLabel = true,
  showMeme = true,
}: ScoreCardProps) {
  const score = clampCookedScore(cookedScore);
  const color = scoreHeatColor(heatLabel);
  const displayHeat =
    heatLabel.trim().charAt(0).toUpperCase() + heatLabel.trim().slice(1).toLowerCase();
  const memeSrc = getScoreMemeSrc(score);

  return (
    <div className="relative overflow-hidden rounded-xl border border-lc-border bg-gradient-to-b from-lc-elevated to-lc-surface p-5 shadow-[0_0_0_1px_rgba(255,161,22,0.08)]">
      {showFooter ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lc-orange">
            Am I Cooked?
          </p>
          {degraded ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-lc-muted">
              degraded mode
            </span>
          ) : null}
        </div>
      ) : null}

      {showMeme ? (
        <div className="relative mb-4 overflow-hidden rounded-lg border border-lc-border/80 bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element -- local gifs; next/image skips animation */}
          <img
            src={memeSrc}
            alt=""
            className="mx-auto max-h-[min(52vw,280px)] w-full object-contain"
            loading="lazy"
            decoding="async"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-3 pt-10"
            aria-hidden
          >
            <p className="font-mono text-3xl font-semibold tabular-nums leading-none" style={{ color }}>
              {score}
              <span className="text-[14px] font-medium text-white/80"> / 100</span>
            </p>
            <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide" style={{ color }}>
              {displayHeat}
            </p>
          </div>
        </div>
      ) : (
        <>
          {showScoreLabel ? (
            <p className="text-[11px] font-medium uppercase tracking-wider text-lc-dim">Cooked Score</p>
          ) : null}
          <div
            className={showScoreLabel ? "mt-1 flex flex-wrap items-end gap-2" : "flex flex-wrap items-end gap-2"}
          >
            <p
              className="font-mono text-5xl font-semibold tabular-nums leading-none sm:text-6xl"
              style={{ color }}
            >
              {score}
            </p>
            <p className="pb-1 font-mono text-[12px] text-lc-muted">
              / 100 ·{" "}
              <span className="font-semibold" style={{ color }}>
                {displayHeat}
              </span>
            </p>
          </div>
        </>
      )}

      {headline ? (
        <p className="mt-4 text-[14px] italic leading-snug text-lc-text">&ldquo;{headline}&rdquo;</p>
      ) : null}

      {showTargetRole && targetRole?.trim() ? (
        <p className="mt-3 text-[12px] font-medium text-lc-muted">{targetRole.trim()}</p>
      ) : null}

      {showFooter ? (
        <p className="mt-5 font-mono text-[10px] text-lc-dim">amicooked.app</p>
      ) : null}
    </div>
  );
}