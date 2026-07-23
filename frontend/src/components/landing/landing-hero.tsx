"use client";

import { createTimeline } from "animejs";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { LandingHeroActions } from "@/components/landing/landing-hero-actions";
import { HERO } from "@/lib/landing-content";
import {
  heroLine,
  landingTransition,
  mergeReducedMotion,
  staggerContainer,
} from "@/lib/landing-motion";
import {
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  SAMPLE_SCORE_DIMENSIONS,
  dimensionPct,
} from "@/lib/score-dimensions";

const HERO_INSIGHTS = [
  "Add metrics to your strongest project bullets.",
  "Prep system-design follow-ups on payments work.",
  "Sharpen the story for backend ownership.",
];

const DIMS = DIMENSION_ORDER.map((key) => ({
  key,
  label: DIMENSION_LABELS[key],
  score: SAMPLE_SCORE_DIMENSIONS[key].score,
  max: SAMPLE_SCORE_DIMENSIONS[key].max,
  pct: dimensionPct(SAMPLE_SCORE_DIMENSIONS[key]),
}));

function barColor(pct: number) {
  if (pct >= 80) return "#00b8a3";
  if (pct >= 55) return "#ffc01e";
  return "#ef4743";
}

function revealHero(el: HTMLElement) {
  el.style.opacity = "1";
  el.style.transform = "none";

  el.querySelectorAll<HTMLElement>(".hero-score-counter").forEach((counter) => {
    counter.textContent = counter.dataset.target ?? counter.textContent;
  });

  el.querySelectorAll<HTMLElement>(".hero-bar-fill").forEach((fill) => {
    fill.style.transform = `scaleX(${fill.dataset.fill ?? "1"})`;
    fill.style.transformOrigin = "left center";
  });

  el.querySelectorAll<HTMLElement>(".hero-insight-item").forEach((item) => {
    item.style.opacity = "1";
    item.style.transform = "none";
  });

  const planStrip = el.querySelector<HTMLElement>(".landing-hero-plan-strip");
  if (planStrip) {
    planStrip.style.opacity = "1";
    planStrip.style.transform = "none";
  }
}

export function LandingHero() {
  const reduce = useReducedMotion();
  const diagnosticRef = useRef<HTMLElement>(null);
  const hasFired = useRef(false);

  useEffect(() => {
    const el = diagnosticRef.current;
    if (!el) return;

    if (reduce) {
      revealHero(el);
      hasFired.current = true;
      return;
    }

    if (hasFired.current) return;
    hasFired.current = true;

    const card = el;
    card.style.opacity = "0";
    card.style.transform = "translateX(40px)";

    const counters = el.querySelectorAll<HTMLElement>(".hero-score-counter");
    const fills = el.querySelectorAll<HTMLElement>(".hero-bar-fill");
    const insightItems = el.querySelectorAll<HTMLElement>(".hero-insight-item");
    const planStrip = el.querySelector<HTMLElement>(".landing-hero-plan-strip");

    counters.forEach((counter) => {
      counter.textContent = "0";
    });
    fills.forEach((f) => {
      f.style.transform = "scaleX(0)";
      f.style.transformOrigin = "left center";
    });
    insightItems.forEach((i) => {
      i.style.opacity = "0";
      i.style.transform = "translateX(-10px)";
    });
    if (planStrip) {
      planStrip.style.opacity = "0";
      planStrip.style.transform = "translateY(12px)";
    }

    const tl = createTimeline({ defaults: { ease: "outExpo" } });

    tl.add(card, {
      opacity: [0, 1],
      x: [40, 0],
      duration: 500,
    }, 600);

    DIMS.forEach((dim, idx) => {
      const fill = fills[idx];
      const counter = counters[idx];
      if (!fill || !counter) return;
      const target = dim.score;
      const fillScale = dim.pct / 100;

      tl.add(fill, {
        scaleX: [0, fillScale],
        duration: 700,
        ease: "outExpo",
      }, 1000 + idx * 80);

      const count = { value: 0 };
      tl.add(count, {
        value: target,
        duration: 750,
        ease: "outExpo",
        onUpdate: () => {
          counter.textContent = String(Math.round(count.value));
        },
      }, 1000 + idx * 80);
    });

    insightItems.forEach((item, idx) => {
      tl.add(item, {
        opacity: [0, 1],
        x: [-10, 0],
        duration: 380,
        ease: "outQuad",
      }, 1850 + idx * 100);
    });

    if (planStrip) {
      tl.add(planStrip, {
        opacity: [0, 1],
        y: [12, 0],
        duration: 420,
      }, 2400);
    }

    const badge = el.querySelector<HTMLElement>(".landing-hero-report-pill");
    if (badge) {
      tl.add(badge, {
        boxShadow: [
          "0 0 0 0 rgba(0,184,163,0)",
          "0 0 0 3px rgba(0,184,163,0.5), 0 0 20px rgba(0,184,163,0.25)",
        ],
        alternate: true,
        duration: 520,
        loop: 2,
        ease: "inOutSine",
      }, 2900);
    }

    tl.play();

    return () => { tl.pause(); };
  }, [reduce]);

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

      <aside
        ref={diagnosticRef}
        className="landing-hero-diagnostic"
        aria-label="Sample Resume Score report"
        style={{ opacity: 0 }}
      >
        <div className="landing-hero-report-top">
          <div>
            <p className="landing-hero-report-kicker">sample report</p>
            <h2 className="landing-hero-report-title">Resume Score</h2>
          </div>
          <span className="landing-hero-report-pill">
            {SAMPLE_SCORE_DIMENSIONS.total} / {SAMPLE_SCORE_DIMENSIONS.total_max}
          </span>
        </div>

        <div className="landing-hero-report-grid">
          <div className="landing-hero-resume-mini relative overflow-hidden" aria-hidden>
            <ScanLine />
            <div className="landing-hero-resume-header">
              <span /><span /><span />
            </div>
            <div className="landing-hero-resume-name" />
            <div className="landing-hero-resume-role" />
            <div className="landing-hero-resume-section">
              <i /><b /><b /><b />
            </div>
            <div className="landing-hero-resume-section landing-hero-resume-section--short">
              <i /><b /><b />
            </div>
          </div>

          <div className="landing-hero-score-mini">
            <p className="font-mono text-[9px] uppercase tracking-wider text-lc-dim mb-2">
              Resume Score
            </p>
            <ul className="space-y-2">
              {DIMS.map((dim) => {
                const color = barColor(dim.pct);
                return (
                  <li key={dim.key}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-lc-text font-medium">{dim.label}</span>
                      <span className="font-mono tabular-nums" style={{ color }}>
                        <span className="hero-score-counter" data-target={dim.score}>
                          0
                        </span>
                        /{dim.max}
                      </span>
                    </div>
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{ height: "3px", background: "rgba(255,255,255,0.08)" }}
                    >
                      <div
                        className="hero-bar-fill h-full rounded-full"
                        data-fill={dim.pct / 100}
                        style={{
                          background: color,
                          transform: "scaleX(0)",
                          transformOrigin: "left center",
                          width: "100%",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="landing-hero-insights">
          <p className="landing-hero-report-kicker">AI Insights</p>
          <ul>
            {HERO_INSIGHTS.map((insight) => (
              <li key={insight} className="hero-insight-item" style={{ opacity: 0 }}>
                {insight}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="landing-hero-plan-strip"
          style={{ opacity: 0 }}
        >
          <span>Next</span>
          <strong>Turn gaps into a day-by-day prep plan</strong>
        </div>
      </aside>

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

function ScanLine() {
  return (
    <div className="hero-scan-line" aria-hidden />
  );
}
