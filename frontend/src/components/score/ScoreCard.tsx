import { ScoreBreakdown } from "@/components/score/ScoreBreakdown";
import { siteHostLabel } from "@/lib/site-url";
import {
  resolveScoreDimensions,
  type ScoreDimensionsPayload,
} from "@/lib/score-dimensions";
import { formatHeatLabel } from "@/lib/score-utils";

export { scoreHeatColor } from "@/lib/score-utils";

export type ScoreCardProps = {
  /** Legacy single score — used when dimensions omitted */
  cookedScore?: number;
  scoreDimensions?: ScoreDimensionsPayload;
  scoreBreakdown?: Record<string, unknown>;
  heatLabel: string;
  headline?: string | null;
  targetRole?: string | null;
  degraded?: boolean;
  showFooter?: boolean;
  showTargetRole?: boolean;
  showTotal?: boolean;
  size?: "default" | "hero";
};

export function ScoreCard({
  cookedScore,
  scoreDimensions,
  scoreBreakdown,
  heatLabel,
  headline,
  targetRole,
  degraded,
  showFooter = true,
  showTargetRole = true,
  showTotal = true,
  size = "default",
}: ScoreCardProps) {
  const dims = resolveScoreDimensions(
    scoreDimensions,
    scoreBreakdown,
    cookedScore ?? null,
  );
  const displayHeat = formatHeatLabel(heatLabel);
  const isHero = size === "hero";

  return (
    <div
      className={`score-card-root relative overflow-hidden rounded-xl border border-lc-border bg-gradient-to-b from-lc-elevated to-lc-surface shadow-[0_0_0_1px_rgba(255,161,22,0.08)] ${
        isHero ? "p-6 sm:p-7" : "p-5"
      }`}
    >
      {showFooter ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <p
            className={`font-mono font-semibold uppercase tracking-[0.14em] text-lc-orange ${
              isHero ? "text-[12px]" : "text-[11px]"
            }`}
          >
            Get Uncooked
          </p>
          {degraded ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-lc-muted">
              degraded mode
            </span>
          ) : null}
        </div>
      ) : null}

      <ScoreBreakdown
        dimensions={dims}
        showTotal={showTotal}
        heatLabel={displayHeat}
        compact={!isHero}
      />

      {headline ? (
        <p
          className={`mt-4 italic leading-snug text-lc-text ${
            isHero ? "text-[16px] sm:text-[18px]" : "text-[14px]"
          }`}
        >
          &ldquo;{headline}&rdquo;
        </p>
      ) : null}

      {showTargetRole && targetRole?.trim() ? (
        <p className="mt-3 text-[12px] font-medium text-lc-muted">{targetRole.trim()}</p>
      ) : null}

      {showFooter ? (
        <p className="mt-5 font-mono text-[10px] text-lc-dim">{siteHostLabel()}</p>
      ) : null}
    </div>
  );
}
