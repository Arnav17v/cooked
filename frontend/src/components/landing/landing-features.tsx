"use client";

import { animate } from "animejs";
import { CheckCircle2, ChevronRight, AlertCircle, Calendar } from "lucide-react";
import { useRef } from "react";
import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";

import { LandingReveal } from "@/components/landing/landing-reveal";
import { useAnimeOnScroll } from "@/lib/use-anime-on-scroll";

const SCORE_BARS = [
  { label: "ATS Check", pct: 85, color: "#00b8a3", score: "17/20" },
  { label: "Content", pct: 77, color: "#ffc01e", score: "31/40" },
  { label: "Job Match", pct: 84, color: "#00b8a3", score: "21/25" },
];

function useCardHover() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const onEnter = () => {
    if (reduce || !ref.current) return;
    animate(ref.current, {
      boxShadow: [
        "0 0 0 1px #3e3e3e",
        "0 0 0 1px #ffa116, 0 0 28px rgba(255,161,22,0.12)",
      ],
      duration: 220,
      ease: "outQuad",
    });
  };

  const onLeave = () => {
    if (reduce || !ref.current) return;
    animate(ref.current, {
      boxShadow: "0 0 0 1px #3e3e3e",
      duration: 320,
      ease: "outQuad",
    });
  };

  return { ref, onEnter, onLeave };
}

function AnimatedBars({ bars }: { bars: typeof SCORE_BARS }) {
  const ref = useAnimeOnScroll((tl, el) => {
    const fills = el.querySelectorAll<HTMLElement>(".feature-bar-fill");
    fills.forEach((fill, idx) => {
      tl.add(fill, {
        scaleX: [0, bars[idx].pct / 100],
        transformOrigin: "left center",
        duration: 700,
        ease: "outExpo",
      }, idx * 80);
    });
  }, {
    threshold: 0.4,
    onReducedMotion: (el) => {
      el.querySelectorAll<HTMLElement>(".feature-bar-fill").forEach((fill) => {
        fill.style.transform = `scaleX(${fill.dataset.animeScaleX ?? "1"})`;
        fill.style.transformOrigin = "left center";
      });
    },
  });

  return (
    <div
      ref={ref}
      className="mt-auto bg-lc-bg border border-lc-border rounded p-4 space-y-3 font-mono text-[11px]"
    >
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex justify-between items-center text-lc-muted mb-1">
            <span>{bar.label}</span>
            <span style={{ color: bar.color }}>{bar.score}</span>
          </div>
          <div className="w-full bg-lc-elevated h-1.5 rounded-full overflow-hidden">
            <div
              className="feature-bar-fill h-full rounded-full"
              data-anime-target
              data-anime-scale-x={bar.pct / 100}
              style={{
                background: bar.color,
                transform: "scaleX(0)",
                transformOrigin: "left center",
                width: "100%",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureCardsWrapper({ children }: { children: ReactNode }) {
  const ref = useAnimeOnScroll((tl, el) => {
    const cards = el.querySelectorAll<HTMLElement>(".feature-card");
    cards.forEach((card, idx) => {
      tl.add(card, {
        opacity: [0, 1],
        y: [36, 0],
        duration: 520,
        ease: "outExpo",
      }, idx * 120);
    });
  }, {
    threshold: 0.15,
    onReducedMotion: (el) => {
      el.querySelectorAll<HTMLElement>(".feature-card").forEach((card) => {
        card.style.opacity = "1";
        card.style.transform = "none";
      });
    },
  });

  return (
    <div ref={ref} className="grid grid-cols-1 gap-6 lg:grid-cols-[1.12fr_0.96fr_0.92fr]">
      {children}
    </div>
  );
}

export function LandingFeatures() {
  const card1 = useCardHover();
  const card2 = useCardHover();
  const card3 = useCardHover();

  return (
    <section className="py-24 border-t border-lc-border" id="features">
      <div className="landing-page">
        <LandingReveal className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-[12px] uppercase tracking-wider text-lc-orange mb-3">
            {"// features"}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-lc-text sm:text-4xl">
            Everything you need <br />
            <span className="text-lc-orange">to walk in prepared.</span>
          </h2>
          <p className="mt-4 text-lc-muted text-sm sm:text-base">
            {"We don't just point out flaws. We build a personalized roadmap from your resume to address your gaps."}
          </p>
        </LandingReveal>

        <FeatureCardsWrapper>
          {/* ── Card 1: Resume Score ── */}
          <div
            ref={card1.ref}
            className="feature-card h-full bg-lc-surface border border-lc-border rounded-lg p-6 flex flex-col"
            data-anime-target
            style={{ opacity: 0, boxShadow: "0 0 0 1px #3e3e3e" }}
            onMouseEnter={card1.onEnter}
            onMouseLeave={card1.onLeave}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[12px] text-lc-orange px-2 py-1 bg-lc-orange/10 border border-lc-orange/20 rounded">
                01
              </span>
              <h3 className="font-semibold text-[16px] text-lc-text">Resume Score</h3>
            </div>
            <p className="text-[13px] text-lc-muted leading-relaxed mb-6">
              A multi-dimensional diagnostic report. We measure ATS compatibility, content strength, writing, and Job Match.
            </p>
            <AnimatedBars bars={SCORE_BARS} />
          </div>

          {/* ── Card 2: AI Insights ── */}
          <div
            ref={card2.ref}
            className="feature-card h-full bg-lc-surface border border-lc-border rounded-lg p-6 flex flex-col"
            data-anime-target
            style={{ opacity: 0, boxShadow: "0 0 0 1px #3e3e3e" }}
            onMouseEnter={card2.onEnter}
            onMouseLeave={card2.onLeave}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[12px] text-lc-orange px-2 py-1 bg-lc-orange/10 border border-lc-orange/20 rounded">
                02
              </span>
              <h3 className="font-semibold text-[16px] text-lc-text">AI Insights</h3>
            </div>
            <p className="text-[13px] text-lc-muted leading-relaxed mb-6">
              Direct feedback on your exact bullet points. No generic tips. Every risk is paired with a suggested rewrite.
            </p>
            <div className="mt-auto bg-lc-bg border border-lc-border rounded p-4 space-y-3">
              <div className="flex items-start gap-2 text-[11px] text-lc-hard">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">Weak Bullet:</span>
                  <p className="text-lc-dim line-through mt-0.5">
                    {'"Responsible for coding features on the payment team."'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-lc-easy border-t border-lc-divider pt-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">Suggested Rewrite:</span>
                  <p className="text-lc-text mt-0.5">
                    {'"Architected payment checkout flow in Go, reducing latency by 14%."'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 3: Prep Plan ── */}
          <div
            ref={card3.ref}
            className="feature-card h-full bg-lc-surface border border-lc-border rounded-lg p-6 flex flex-col"
            data-anime-target
            style={{ opacity: 0, boxShadow: "0 0 0 1px #3e3e3e" }}
            onMouseEnter={card3.onEnter}
            onMouseLeave={card3.onLeave}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[12px] text-lc-orange px-2 py-1 bg-lc-orange/10 border border-lc-orange/20 rounded">
                03
              </span>
              <h3 className="font-semibold text-[16px] text-lc-text">Interview Prep Plan</h3>
            </div>
            <p className="text-[13px] text-lc-muted leading-relaxed mb-6">
              A structured day-by-day plan built directly from your score gaps. Contains study modules, notes, and custom quizzes.
            </p>
            <div className="mt-auto bg-lc-bg border border-lc-border rounded p-4 font-mono text-[11px] space-y-2.5">
              <div className="flex items-center justify-between text-lc-muted border-b border-lc-divider pb-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-lc-orange" />
                  PREP TIMELINE
                </span>
                <span className="text-lc-dim">Day 1-5</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-lc-elevated px-2 py-1.5 rounded text-lc-text">
                  <span className="text-lc-orange font-bold">D.01</span>
                  <span className="truncate">Explain payments checkout scale</span>
                  <ChevronRight className="w-3 h-3 ml-auto text-lc-dim" />
                </div>
                <div className="flex items-center gap-2 bg-lc-elevated/40 px-2 py-1.5 rounded text-lc-muted">
                  <span className="text-lc-dim">D.02</span>
                  <span className="truncate">Latency bottleneck notes</span>
                </div>
                <div className="flex items-center gap-2 bg-lc-elevated/40 px-2 py-1.5 rounded text-lc-muted">
                  <span className="text-lc-dim">D.03</span>
                  <span className="truncate">Payment recovery system design</span>
                </div>
              </div>
            </div>
          </div>
        </FeatureCardsWrapper>
      </div>
    </section>
  );
}
