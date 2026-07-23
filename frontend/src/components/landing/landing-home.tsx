"use client";

import { animate } from "animejs";
import { useReducedMotion } from "motion/react";

import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooterCta } from "@/components/landing/landing-footer-cta";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowTimeline } from "@/components/landing/landing-how-timeline";
import { LandingPrepPreview } from "@/components/landing/landing-prep-preview";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingTrustFaq } from "@/components/landing/landing-trust-faq";
import {
  FOOTER_CTA,
  MARQUEE_ITEMS,
  META,
  SECTIONS,
} from "@/lib/landing-content";
import { siteHostLabel } from "@/lib/site-url";

export function LandingHome() {
  const marqueeDoubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  const reduce = useReducedMotion();

  function highlightMarqueeItem(item: HTMLElement) {
    if (reduce) return;
    animate(item, {
      scale: 1.05,
      color: "#ffa116",
      duration: 180,
      ease: "outQuad",
    });
  }

  function resetMarqueeItem(item: HTMLElement) {
    if (reduce) return;
    animate(item, {
      scale: 1,
      color: "#b3b3b3",
      duration: 240,
      ease: "outQuad",
    });
  }

  return (
    <>
      <div className="landing-page">
        <LandingHero />
      </div>

      <div className="landing-marquee-wrap" aria-hidden>
        <div className="landing-marquee-track">
          {marqueeDoubled.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="landing-marquee-item"
              onMouseEnter={(event) => highlightMarqueeItem(event.currentTarget)}
              onMouseLeave={(event) => resetMarqueeItem(event.currentTarget)}
            >
              <span className="landing-marquee-dot" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <LandingFeatures />

      <LandingPrepPreview />

      <div className="landing-page" id="how">
        <section className="landing-how-section landing-how-section--prep">
          <LandingReveal className="landing-section-header">
            <div>
              <p className="landing-section-eyebrow">{SECTIONS.howEyebrow}</p>
              <h2 className="landing-section-title">
                {SECTIONS.howTitle}
                <br />
                {SECTIONS.howTitleBreak}
              </h2>
            </div>
          </LandingReveal>

          <LandingHowTimeline />
        </section>
      </div>

      <LandingTrustFaq />

      <div className="landing-page">
        <LandingReveal>
          <div className="landing-meta-band landing-meta-band--prep">
            <p className="landing-meta-left">
              {siteHostLabel()}
              <br />
              {META.leftLines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
            <p className="landing-meta-right">&ldquo;{META.rightQuote}&rdquo;</p>
          </div>
        </LandingReveal>
      </div>

      <div className="landing-page">
        <section className="landing-footer-cta">
          <LandingReveal>
            <p className="landing-footer-cta-eyebrow">{FOOTER_CTA.eyebrow}</p>
            <h2 className="landing-footer-cta-title">
              {FOOTER_CTA.title} <span>{FOOTER_CTA.titleAccent}</span>
            </h2>
            <p className="landing-footer-cta-sub">{FOOTER_CTA.sub}</p>
          </LandingReveal>
          <LandingFooterCta />
        </section>
      </div>
    </>
  );
}
