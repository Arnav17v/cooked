"use client";

import Link from "next/link";

import { QuizPrimaryButton } from "@/components/interview/quiz-ui";
import { normalizeHeatLabel } from "@/components/roast/roast-shared";

type Props = {
  sessionId: string;
  finalScore: number;
  heatLabel: string;
  headline: string;
  returnTo: string;
  onBackToPlan: () => void;
  submitError?: string | null;
};

export function QuizPlanResults({
  sessionId,
  finalScore,
  heatLabel,
  headline,
  returnTo,
  onBackToPlan,
  submitError,
}: Props) {
  const heat = normalizeHeatLabel(heatLabel);

  return (
    <div className="plan-quiz-results">
      <p className="plan-field-label">Quiz complete</p>
      <div className="plan-quiz-score-card">
        <p className="plan-quiz-score-num">
          {finalScore}
          <span className="plan-quiz-score-denom">/100</span>
        </p>
        <p className="plan-quiz-score-heat">{heat}</p>
        {headline ? <p className="plan-quiz-score-oneliner">&ldquo;{headline}&rdquo;</p> : null}
      </div>

      {submitError ? (
        <p className="plan-quiz-results-error" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="plan-quiz-results-actions">
        <QuizPrimaryButton onClick={onBackToPlan} className="min-w-[220px]">
          Back to plan
        </QuizPrimaryButton>
        <Link href={`/quiz/results/${sessionId}`} className="plan-link-btn">
          Full breakdown
        </Link>
      </div>
      <p className="plan-quiz-results-hint">
        Saved to this lesson. Return anytime via{" "}
        <Link href={returnTo} className="plan-link-btn">
          your plan
        </Link>
        .
      </p>
    </div>
  );
}
