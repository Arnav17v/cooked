import Link from "next/link";

import { LandingCustomCursor } from "@/components/landing/landing-custom-cursor";
import { siteHostLabel } from "@/lib/site-url";
import { LandingFooterCta } from "@/components/landing/landing-footer-cta";
import { LandingHeroActions } from "@/components/landing/landing-hero-actions";
import { LandingNav } from "@/components/landing/landing-nav";

import "./landing-v3.css";

const MARQUEE_ITEMS = [
  "Resume Scoring",
  "Red Flag Detection",
  "Rewrite Suggestions",
  "Interview Questions",
  "Quiz + Grading",
  "AI Study Notes",
  "Public Share Card",
  "PDF Upload",
];

const FEATURES = [
  {
    num: "01",
    icon: "⚡",
    title: "Brutal Score + Heat Label",
    desc: "0–100 score plus a heat label. Built to screenshot on a share card.",
    tag: "Instant",
  },
  {
    num: "02",
    icon: "🚩",
    title: "Red Flags + Rewrites",
    desc: "Every weak bullet flagged with the issue and a suggested rewrite — not vague advice.",
    tag: "Actionable",
  },
  {
    num: "03",
    icon: "🎯",
    title: "Personalized Questions",
    desc: "Interview questions generated from your actual resume — not a generic bank.",
    tag: "Role-specific",
  },
  {
    num: "04",
    icon: "🧠",
    title: "Interview Quiz + AI Grading",
    desc: "Answer out loud, submit, get scored. Short, medium, or long quiz lengths.",
    tag: "Interactive",
  },
  {
    num: "05",
    icon: "📖",
    title: "AI Study Notes",
    desc: "Prep notes by section. Edit, renew, and focus on weak areas from your quiz.",
    tag: "Adaptive",
  },
  {
    num: "06",
    icon: "🔗",
    title: "Public Share Card",
    desc: "Shareable score page with OG image for Twitter and LinkedIn.",
    tag: "Viral loop",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Log in & upload",
    desc: "Create an account, paste or upload a PDF, pick your target role.",
  },
  {
    n: "02",
    title: "AI tears through every section",
    desc: "Watch the roast stream live. Score, flags, and questions — honest when providers flake.",
  },
  {
    n: "03",
    title: "Practice. Improve. Share.",
    desc: "Take the quiz, refresh notes, copy your public score link if you want receipts.",
  },
];

export default function Home() {
  const marqueeDoubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="landing-v3">
      <LandingCustomCursor />
      <LandingNav />

      <div className="landing-page">
        <section className="landing-hero">
          <div className="landing-hero-bg-num" aria-hidden>
            47
          </div>
          <p className="landing-hero-eyebrow">AI Resume Analysis</p>
          <h1 className="landing-hero-headline">
            <span className="line1">Your resume</span>
            <span className="line2">looks fine.</span>
            <span className="line3">
              Until you&apos;re <span className="word-cooked">cooked</span>.
            </span>
          </h1>
          <p className="landing-hero-sub">
            Get a <em>brutally honest score</em>, red flags with rewrites, personalized interview
            questions, and study notes — all from a single upload.
          </p>
          <LandingHeroActions />
        </section>
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

      <div className="landing-score-band" id="sample">
        <div className="landing-page">
          <section className="landing-score-section">
            <div>
              <p className="landing-score-label-sm">Sample output</p>
              <div className="landing-score-card-big">
                <p className="landing-score-num-big">
                  68<span className="landing-score-denom-big">/100</span>
                </p>
                <p className="landing-score-heat">Medium</p>
                <p className="landing-score-roast">
                  &ldquo;Placeholder layout — sign in and upload to get your real score, flags, and
                  questions.&rdquo;
                </p>
              </div>
            </div>
            <div>
              <h2 className="landing-score-right-head">
                Not just a score.
                <br />
                A <em>diagnosis.</em>
              </h2>
              <p>
                We read your bullets, flag vague claims, and tell you what a recruiter might think —
                before they ghost you.
              </p>
              <ul className="landing-flag-list">
                <li>
                  <span className="landing-flag-icon" aria-hidden>
                    !
                  </span>
                  <span>No quantified impact — &ldquo;improved performance&rdquo; means nothing</span>
                </li>
                <li>
                  <span className="landing-flag-icon" aria-hidden>
                    !
                  </span>
                  <span>Projects with zero users or production metrics</span>
                </li>
                <li>
                  <span className="landing-flag-icon" aria-hidden>
                    !
                  </span>
                  <span>Tech stack listed without how you used it</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      <div className="landing-page" id="features">
        <section className="landing-features-section">
          <p className="landing-section-eyebrow">What you get</p>
          <h2 className="landing-section-title">
            Everything you need
            <br />
            to stop getting ghosted.
          </h2>
          <div className="landing-features-grid">
            {FEATURES.map((f) => (
              <article key={f.num} className="landing-feat">
                <p className="landing-feat-num">{f.num}</p>
                <div className="landing-feat-icon-wrap">
                  <span aria-hidden>{f.icon}</span>
                </div>
                <h3 className="landing-feat-title">{f.title}</h3>
                <p className="landing-feat-desc">{f.desc}</p>
                <span className="landing-feat-tag">{f.tag}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="landing-stats-section">
        <div className="landing-stats-inner">
          <div className="landing-stat">
            <p className="landing-stat-num">
              0<sub>–</sub>100
            </p>
            <p className="landing-stat-label">Cooked Score</p>
            <p className="landing-stat-desc">Heat label plus a one-liner worth screenshotting</p>
          </div>
          <div className="landing-stat">
            <p className="landing-stat-num">
              10<sub>+</sub>
            </p>
            <p className="landing-stat-label">Interview Questions</p>
            <p className="landing-stat-desc">Grounded in your bullets every run</p>
          </div>
          <div className="landing-stat">
            <p className="landing-stat-num">
              2<sub>/day</sub>
            </p>
            <p className="landing-stat-label">Free Roasts</p>
            <p className="landing-stat-desc">Account required so the daily cap means something</p>
          </div>
        </div>
      </div>

      <div className="landing-page" id="how">
        <section className="landing-how-section">
          <div className="landing-section-header">
            <div>
              <p className="landing-section-eyebrow">Process</p>
              <h2 className="landing-section-title">
                From upload
                <br />
                to interview-ready.
              </h2>
            </div>
            <Link href="/roast" className="landing-btn-ghost">
              Start now →
            </Link>
          </div>
          <div className="landing-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="landing-step">
                <p className="landing-step-n">{s.n}</p>
                <h3 className="landing-step-title">{s.title}</h3>
                <p className="landing-step-desc">{s.desc}</p>
                <span className="landing-step-arrow" aria-hidden>
                  →
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="landing-page">
        <div className="landing-meta-band">
          <p className="landing-meta-left">
            {siteHostLabel()}
            <br />
            Free · account required
            <br />
            2 roasts / day
            <br />
            ──────────────
            <br />
            Built for people who
            <br />
            want blunt feedback.
          </p>
          <p className="landing-meta-right">
            &ldquo;Your resume has problems you <em>don&apos;t know about</em>. Find them before the
            recruiter does.&rdquo;
          </p>
        </div>
      </div>

      <div className="landing-page">
        <section className="landing-footer-cta">
          <p className="landing-footer-cta-eyebrow">Ready to find out?</p>
          <h2 className="landing-footer-cta-title">
            Are you <span>cooked?</span>
          </h2>
          <p className="landing-footer-cta-sub">Free. Brutal. Usually 1–2 minutes per roast.</p>
          <LandingFooterCta />
        </section>
      </div>

      <footer className="landing-bottom-bar">
        <span>
          Am I Cooked? © {new Date().getFullYear()} ·{" "}
          <Link href="/">{siteHostLabel()}</Link>
        </span>
        <span>Free · 2 roasts/day · account required</span>
        <span className="landing-bottom-accent">{"// built in public"}</span>
      </footer>
    </div>
  );
}
