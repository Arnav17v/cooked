"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

import {
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  dimensionPct,
  type ScoreDimensionsPayload,
} from "@/lib/score-dimensions";
import { dimensionScoreColor, scoreHeatColor } from "@/lib/score-utils";

type Props = {
  dimensions: ScoreDimensionsPayload;
  /** Show total as secondary line */
  showTotal?: boolean;
  heatLabel?: string | null;
  compact?: boolean;
};

const BAR_EASE = [0.25, 1, 0.5, 1] as const;

export function ScoreBreakdown({
  dimensions,
  showTotal = true,
  heatLabel,
  compact = false,
}: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const animateBars = reduce || inView;
  const totalColor = heatLabel ? scoreHeatColor(heatLabel) : "#ffa116";

  return (
    <div ref={ref} className={compact ? "space-y-2.5" : "space-y-3"}>
      {showTotal ? (
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-lc-dim">Resume Score</p>
          <p
            className="font-mono text-3xl font-semibold tabular-nums leading-none sm:text-4xl"
            style={{ color: totalColor }}
          >
            {dimensions.total}
          </p>
          <p className="font-mono text-[13px] text-lc-muted">/ {dimensions.total_max}</p>
          {heatLabel ? (
            <p className="font-mono text-[12px] font-semibold" style={{ color: totalColor }}>
              {heatLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      <ul className={compact ? "space-y-2" : "space-y-2.5"} role="list">
        {DIMENSION_ORDER.map((key, idx) => {
          const entry = dimensions[key];
          const pct = dimensionPct(entry);
          const barColor = dimensionScoreColor(entry.score, entry.max);
          const fillScale = pct / 100;

          return (
            <li key={key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                <span className="font-medium text-lc-text">{DIMENSION_LABELS[key]}</span>
                <span className="font-mono tabular-nums" style={{ color: barColor }}>
                  {entry.score}/{entry.max}
                </span>
              </div>
              <div
                className="score-dim-bar-track"
                role="progressbar"
                aria-valuenow={entry.score}
                aria-valuemin={0}
                aria-valuemax={entry.max}
                aria-label={`${DIMENSION_LABELS[key]} ${entry.score} of ${entry.max}`}
              >
                <motion.div
                  className="score-dim-bar-fill"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: animateBars ? fillScale : 0 }}
                  transition={{
                    duration: 0.65,
                    delay: idx * 0.1,
                    ease: BAR_EASE,
                  }}
                  style={{
                    transformOrigin: "left center",
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
