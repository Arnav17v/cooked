"use client";

import { motion, useReducedMotion } from "motion/react";

import { LandingHeroActions } from "@/components/landing/landing-hero-actions";
import { ScoreBreakdown } from "@/components/score/ScoreBreakdown";
import { HERO } from "@/lib/landing-content";
import {
  heroLine,
  landingTransition,
  mergeReducedMotion,
  staggerContainer,
} from "@/lib/landing-motion";
import { SAMPLE_SCORE_DIMENSIONS } from "@/lib/score-dimensions";

const HERO_INSIGHTS = [
  "Add metrics to your strongest project bullets.",
  "Prep system-design follow-ups on payments work.",
  "Sharpen the story for backend ownership.",
];

export function LandingHero() {
  const reduce = useReducedMotion();

  return (
    <section className="landing-hero landing-hero--prep">
      <div className="landing-hero-grain" aria-hidden />
      <div className="landing-hero-bg-num" aria-hidden>
        47
      </div>

      <motion.div
        className="landing-hero-inner"
        initial="hidden"
        animate="visible"
        variants={mergeReducedMotion(reduce, staggerContainer)}
      >
        <motion.p className="landing-hero-eyebrow" variants={mergeReducedMotion(reduce, heroLine)}>
          {HERO.eyebrow}
        </motion.p>

        <h1 className="landing-hero-headline">
          <motion.span className="line1" variants={mergeReducedMotion(reduce, heroLine)}>
            {HERO.lines[0]}
          </motion.span>
          <motion.span className="line2" variants={mergeReducedMotion(reduce, heroLine)}>
            {HERO.lines[1]}
          </motion.span>
        </h1>

        <motion.p
          className="landing-hero-sub"
          variants={mergeReducedMotion(reduce, heroLine)}
          transition={landingTransition(0.55)}
        >
          {HERO.sub}
        </motion.p>

        <motion.div variants={mergeReducedMotion(reduce, heroLine)}>
          <LandingHeroActions />
        </motion.div>
      </motion.div>

      <motion.aside
        className="landing-hero-diagnostic"
        aria-label="Sample Resume Score report"
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={landingTransition(0.7)}
      >
        <div className="landing-hero-report-top">
          <div>
            <p className="landing-hero-report-kicker">sample report</p>
            <h2 className="landing-hero-report-title">Resume Score</h2>
          </div>
          <span className="landing-hero-report-pill">81 / 100</span>
        </div>

        <div className="landing-hero-report-grid">
          <div className="landing-hero-resume-mini" aria-hidden>
            <div className="landing-hero-resume-header">
              <span />
              <span />
              <span />
            </div>
            <div className="landing-hero-resume-name" />
            <div className="landing-hero-resume-role" />
            <div className="landing-hero-resume-section">
              <i />
              <b />
              <b />
              <b />
            </div>
            <div className="landing-hero-resume-section landing-hero-resume-section--short">
              <i />
              <b />
              <b />
            </div>
          </div>

          <div className="landing-hero-score-mini">
            <ScoreBreakdown dimensions={SAMPLE_SCORE_DIMENSIONS} heatLabel="Medium" compact />
          </div>
        </div>

        <div className="landing-hero-insights">
          <p className="landing-hero-report-kicker">AI Insights</p>
          <ul>
            {HERO_INSIGHTS.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        </div>

        <div className="landing-hero-plan-strip">
          <span>Next</span>
          <strong>Turn gaps into a day-by-day prep plan</strong>
        </div>
      </motion.aside>

      <div className="landing-hero-rail" aria-hidden>
        <span className="landing-hero-rail-label">Today</span>
        <span className="landing-hero-rail-line" />
        <span className="landing-hero-rail-dot landing-hero-rail-dot--active" />
        <span className="landing-hero-rail-dot" />
        <span className="landing-hero-rail-dot" />
        <span className="landing-hero-rail-label landing-hero-rail-label--end">Interview</span>
      </div>
    </section>
  );
}
