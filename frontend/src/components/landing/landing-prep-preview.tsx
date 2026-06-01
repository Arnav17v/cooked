"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { LandingReveal } from "@/components/landing/landing-reveal";
import { SECTIONS } from "@/lib/landing-content";
import { fadeIn, landingTransition } from "@/lib/landing-motion";

const DAYS = [
  { n: 1, label: "Resume + role fit", active: false },
  { n: 2, label: "Behavioral stories", active: false },
  { n: 3, label: "System design", active: true },
  { n: 4, label: "Mock + review", active: false },
];

export function LandingPrepPreview() {
  const reduce = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState(2);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setActiveIdx((i) => (i + 1) % DAYS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="landing-proof-band" id="sample">
      <div className="landing-page">
        <LandingReveal className="landing-proof-intro">
          <p className="landing-section-eyebrow">{SECTIONS.proofEyebrow}</p>
          <h2 className="landing-section-title landing-proof-title">
            {SECTIONS.proofTitle}
            <br />
            {SECTIONS.proofTitleBreak}
          </h2>
        </LandingReveal>

        <motion.div
          className="landing-prep-stage-wrap"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-48px" }}
          transition={landingTransition(0.6)}
        >
          <motion.div
            className="landing-prep-stage"
            animate={
              reduce
                ? undefined
                : {
                    y: [0, -5, 0],
                    transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
                  }
            }
          >
          <div className="landing-prep-stage-chrome">
            <span className="landing-prep-stage-dot" />
            <span className="landing-prep-stage-dot" />
            <span className="landing-prep-stage-dot" />
            <span className="landing-prep-stage-url">/plan · Standard Chartered prep</span>
          </div>

          <div className="landing-prep-mock">
            <aside className="landing-prep-sidebar">
              <p className="landing-prep-sidebar-label">Course content</p>
              <p className="landing-prep-sidebar-title">Standard Chartered · SDE</p>
              <ul className="landing-prep-days">
                {DAYS.map((day, idx) => (
                  <li
                    key={day.n}
                    className={`landing-prep-day${
                      (reduce ? day.active : idx === activeIdx) ? " landing-prep-day--active" : ""
                    }`}
                  >
                    <span className="landing-prep-day-n">Day {day.n}</span>
                    <span className="landing-prep-day-label">{day.label}</span>
                    {idx === activeIdx || (reduce && day.active) ? (
                      <span className="landing-prep-day-score">72</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </aside>

            <div className="landing-prep-lesson">
              <p className="landing-prep-lesson-meta">Day 3 · System design</p>
              <h3 className="landing-prep-lesson-title">Design a payments ledger</h3>
              <p className="landing-prep-lesson-snippet">
                Start with idempotency keys and double-entry invariants. Draw write path vs read
                path before you mention Kafka…
              </p>
              <motion.div
                className="landing-prep-quiz-pill"
                initial={false}
                animate={{ opacity: [0.85, 1, 0.85] }}
                transition={
                  reduce
                    ? undefined
                    : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                }
              >
                Quiz complete · 72/100 · Medium
              </motion.div>
            </div>
          </div>
          </motion.div>
        </motion.div>

        <LandingReveal className="landing-score-compact-wrap" delay={0.12}>
          <div className="landing-score-compact">
            <div>
              <p className="landing-score-label-sm">{SECTIONS.scoreEyebrow}</p>
              <h3 className="landing-score-compact-title">{SECTIONS.scoreTitle}</h3>
              <p className="landing-score-compact-desc">{SECTIONS.scoreRoast}</p>
            </div>
            <motion.div
              className="landing-score-card-big landing-score-card-big--compact"
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={landingTransition()}
            >
              <p className="landing-score-num-big">
                68<span className="landing-score-denom-big">/100</span>
              </p>
              <p className="landing-score-heat">Medium</p>
              <p className="landing-score-roast">
                &ldquo;Solid projects — weak on metrics and tradeoffs when pressed.&rdquo;
              </p>
            </motion.div>
          </div>
        </LandingReveal>
      </div>
    </div>
  );
}
