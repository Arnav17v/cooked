"use client";

import Link from "next/link";

import { LandingFooterCta } from "@/components/landing/landing-footer-cta";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingPrepPreview } from "@/components/landing/landing-prep-preview";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingStagger, LandingStaggerItem } from "@/components/landing/landing-stagger";
import {
  FEATURES,
  FOOTER_CTA,
  MARQUEE_ITEMS,
  META,
  SECTIONS,
  STATS,
  STEPS,
} from "@/lib/landing-content";
import { siteHostLabel } from "@/lib/site-url";

export function LandingHome() {
  const marqueeDoubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <>
      <div className="landing-page">
        <LandingHero />
      </div>

      <div className="landing-marquee-wrap" aria-hidden>
        <div className="landing-marquee-track">
          {marqueeDoubled.map((label, i) => (
            <span key={`${label}-${i}`} className="landing-marquee-item">
              <span className="landing-marquee-dot" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <LandingPrepPreview />

      <div className="landing-page" id="features">
        <section className="landing-features-section landing-features-section--prep">
          <LandingReveal>
            <p className="landing-section-eyebrow">{SECTIONS.featuresEyebrow}</p>
            <h2 className="landing-section-title">
              {SECTIONS.featuresTitle}
              <br />
              {SECTIONS.featuresTitleBreak}
            </h2>
            <p className="landing-section-sub">{SECTIONS.featuresSub}</p>
          </LandingReveal>

          <LandingStagger className="landing-features-rail" as="div">
            {FEATURES.map((f) => (
              <LandingStaggerItem
                key={f.num}
                as="article"
                className={`landing-feat-rail${f.featured ? " landing-feat-rail--featured" : ""}`}
              >
                <p className="landing-feat-num">{f.num}</p>
                <div className="landing-feat-rail-body">
                  <h3 className="landing-feat-title">{f.title}</h3>
                  <p className="landing-feat-desc">{f.desc}</p>
                  <span className="landing-feat-tag">{f.tag}</span>
                </div>
              </LandingStaggerItem>
            ))}
          </LandingStagger>
        </section>
      </div>

      <div className="landing-stats-section landing-stats-section--prep">
        <LandingStagger as="div" className="landing-stats-grid">
          {STATS.map((s) => (
            <LandingStaggerItem key={s.label} className="landing-stat landing-stat--prep">
              <p className="landing-stat-num" aria-label={s.value}>
                {s.valueAccent != null && s.valueLead != null ? (
                  <>
                    <span className="landing-stat-num-lead">{s.valueLead}</span>{" "}
                    <span className="landing-stat-num-accent">{s.valueAccent}</span>
                  </>
                ) : (
                  s.value
                )}
              </p>
              <p className="landing-stat-label">{s.label}</p>
              <p className="landing-stat-desc">{s.desc}</p>
            </LandingStaggerItem>
          ))}
        </LandingStagger>
      </div>

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
            <Link href="/plan" className="landing-btn-ghost">
              Start prep plan →
            </Link>
          </LandingReveal>

          <LandingStagger className="landing-timeline" as="div">
            {STEPS.map((s, idx) => (
              <LandingStaggerItem key={s.n} className="landing-timeline-step">
                <div className="landing-timeline-node">
                  <span className="landing-step-n">{s.n}</span>
                  {idx < STEPS.length - 1 ? (
                    <span className="landing-timeline-line" aria-hidden />
                  ) : null}
                </div>
                <div className="landing-timeline-content">
                  <h3 className="landing-step-title">{s.title}</h3>
                  <p className="landing-step-desc">{s.desc}</p>
                </div>
              </LandingStaggerItem>
            ))}
          </LandingStagger>
        </section>
      </div>

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
