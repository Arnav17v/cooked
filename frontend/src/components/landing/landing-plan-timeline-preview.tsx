"use client";

import { motion } from "motion/react";

import { useLandingScrollFill } from "@/lib/landing-scroll-progress";

export type LandingPlanTimelineDay = {
  n: number;
  date: string;
  intensity: string;
  focus: string;
  summary: string;
};

type Props = {
  days: readonly LandingPlanTimelineDay[];
  intensityClass: (intensity: string) => string;
};

export function LandingPlanTimelinePreview({ days, intensityClass }: Props) {
  const { ref, fillScale, reduce } = useLandingScrollFill(["start 0.9", "end 0.2"]);

  return (
    <div ref={ref} className="landing-plan-timeline-progress">
      <div className="landing-plan-timeline-rail" aria-hidden>
        <div className="landing-plan-timeline-rail-bg" />
        <motion.div
          className="landing-plan-timeline-rail-fill"
          style={{ scaleY: reduce ? 1 : fillScale }}
        />
      </div>

      <ol className="plan-timeline landing-plan-timeline-sample">
        {days.map((day) => (
          <li key={day.n} className="plan-day-card">
            <div className="plan-day-card-rail plan-day-card-rail--sample" aria-hidden />
            <div className="plan-day-card-body">
              <div className="plan-day-card-top">
                <span className="plan-day-date">
                  Day {day.n} · {day.date}
                </span>
                <span className={intensityClass(day.intensity)}>{day.intensity}</span>
              </div>
              <h2 className="plan-day-focus">{day.focus}</h2>
              <p className="plan-day-summary">{day.summary}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
