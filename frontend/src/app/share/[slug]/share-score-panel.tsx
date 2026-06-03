"use client";

import { ScoreCard } from "@/components/score/ScoreCard";
import { ScoreShareActions } from "@/components/score/ScoreShareActions";
import type { ShareInsightPreview } from "@/lib/api";
import { resolveScoreDimensions, type ScoreDimensionsPayload } from "@/lib/score-dimensions";

type ShareScorePanelProps = {
  score: number;
  scoreDimensions?: ScoreDimensionsPayload;
  heatLabel: string;
  headline?: string | null;
  targetRole?: string | null;
  shareSlug: string;
  degraded?: boolean;
  insightsPreview?: ShareInsightPreview[];
};

export function ShareScorePanel({
  score,
  scoreDimensions,
  heatLabel,
  headline,
  targetRole,
  shareSlug,
  degraded,
  insightsPreview = [],
}: ShareScorePanelProps) {
  const dims = resolveScoreDimensions(scoreDimensions, undefined, score);

  return (
    <div>
      <ScoreCard
        cookedScore={score}
        scoreDimensions={dims}
        heatLabel={heatLabel}
        headline={headline}
        targetRole={targetRole}
        degraded={degraded}
        showFooter
      />
      {insightsPreview.length > 0 ? (
        <div className="mt-5 space-y-3 rounded-lg border border-lc-border bg-lc-surface/80 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-lc-dim">AI Insights preview</p>
          {insightsPreview.map((item, idx) => (
            <div key={idx} className="border-l-2 border-lc-orange/60 pl-3">
              <p className="text-[13px] leading-relaxed text-lc-text">{item.issue}</p>
            </div>
          ))}
        </div>
      ) : null}
      <ScoreShareActions
        className="mt-4"
        score={dims.total}
        shareSlug={shareSlug}
        heatLabel={heatLabel}
        headline={headline}
      />
    </div>
  );
}
