"use client";

import { motion, useTransform } from "motion/react";

import { LandingStagger, LandingStaggerItem } from "@/components/landing/landing-stagger";
import { STEPS } from "@/lib/landing-content";
import { useLandingScrollFill } from "@/lib/landing-scroll-progress";

export function LandingHowTimeline() {
  const { ref, fillScale, scrollYProgress, reduce } = useLandingScrollFill();
  const stroke01 = useTransform(scrollYProgress, [0, 0.22], ["var(--lv-rule-strong)", "var(--lv-rust)"]);
  const stroke02 = useTransform(scrollYProgress, [0.18, 0.55], ["var(--lv-rule-strong)", "var(--lv-rust)"]);
  const stroke03 = useTransform(scrollYProgress, [0.48, 0.92], ["var(--lv-rule-strong)", "var(--lv-rust)"]);
  const strokes = [stroke01, stroke02, stroke03];

  return (
    <div ref={ref} className="landing-timeline landing-timeline--progress">
      <div className="landing-timeline-rail" aria-hidden>
        <div className="landing-timeline-rail-bg" />
        <motion.div
          className="landing-timeline-rail-fill"
          style={{ scaleX: reduce ? 1 : fillScale }}
        />
      </div>

      <LandingStagger className="landing-timeline-steps" as="div">
        {STEPS.map((s, idx) => (
          <LandingStaggerItem key={s.n} className="landing-timeline-step">
            <div className="landing-timeline-node">
              <motion.span
                className="landing-step-n"
                style={
                  reduce
                    ? { WebkitTextStrokeColor: "var(--lv-rust)" }
                    : { WebkitTextStrokeColor: strokes[idx] }
                }
              >
                {s.n}
              </motion.span>
            </div>
            <div className="landing-timeline-content">
              <h3 className="landing-step-title landing-step-title--timeline">{s.title}</h3>
            </div>
          </LandingStaggerItem>
        ))}
      </LandingStagger>
    </div>
  );
}
