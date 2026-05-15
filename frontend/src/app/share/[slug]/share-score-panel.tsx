"use client";

import { ScoreCard } from "@/components/score/ScoreCard";
import { ScoreShareActions } from "@/components/score/ScoreShareActions";

type ShareScorePanelProps = {
  score: number;
  heatLabel: string;
  headline?: string | null;
  targetRole?: string | null;
  shareSlug: string;
  degraded?: boolean;
};

export function ShareScorePanel({
  score,
  heatLabel,
  headline,
  targetRole,
  shareSlug,
  degraded,
}: ShareScorePanelProps) {
  return (
    <div>
      <ScoreCard
        cookedScore={score}
        heatLabel={heatLabel}
        headline={headline}
        targetRole={targetRole}
        degraded={degraded}
        showFooter
      />
      <ScoreShareActions
        className="mt-4"
        score={score}
        shareSlug={shareSlug}
        heatLabel={heatLabel}
        headline={headline}
      />
    </div>
  );
}
