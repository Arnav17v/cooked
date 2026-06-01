"use client";

import { motion, useReducedMotion } from "motion/react";

import { LandingHeroActions } from "@/components/landing/landing-hero-actions";
import { HERO } from "@/lib/landing-content";
import {
  heroLine,
  landingTransition,
  mergeReducedMotion,
  staggerContainer,
} from "@/lib/landing-motion";

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
          <motion.span className="line3" variants={mergeReducedMotion(reduce, heroLine)}>
            Get <span className="word-cooked">{HERO.cookedWord}</span>.
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
