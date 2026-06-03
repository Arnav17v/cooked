"use client";

import { motion, useReducedMotion } from "motion/react";

import { LandingPlanMock } from "@/components/landing/landing-plan-mock";
import { LandingPlanNotesShowcase } from "@/components/landing/landing-plan-notes-showcase";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { SECTIONS } from "@/lib/landing-content";
import { landingTransition } from "@/lib/landing-motion";

const PREP_STEPS = [
  "Paste your JD",
  "Upload resume",
  "Get your plan",
] as const;

export function LandingPrepPreview() {
  const reduce = useReducedMotion();

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
          <p className="landing-section-sub">{SECTIONS.proofSub}</p>
        </LandingReveal>

        <motion.div
          className="landing-report-stage landing-report-stage--plan"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-48px" }}
          transition={landingTransition(0.6)}
        >
          <LandingPlanMock />

          <section className="landing-report-prep" aria-label="How to start your plan">
            <span className="landing-report-prep-icon" aria-hidden>
              🏷️
            </span>
            <h3 className="landing-report-prep-headline">
              <span>Save this for</span>
              <span className="landing-report-prep-accent">your next interview.</span>
            </h3>
            <ol className="landing-report-prep-steps">
              {PREP_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        </motion.div>

        <LandingReveal className="landing-plan-notes-wrap" delay={0.12}>
          <div className="landing-plan-notes-intro">
            <p className="landing-score-label-sm">{SECTIONS.planNotesEyebrow}</p>
            <h3 className="landing-score-compact-title">{SECTIONS.planNotesTitle}</h3>
            <p className="landing-score-compact-desc">{SECTIONS.planNotesSub}</p>
          </div>
          <LandingPlanNotesShowcase />
        </LandingReveal>
      </div>
    </div>
  );
}
