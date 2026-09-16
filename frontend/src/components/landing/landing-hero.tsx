"use client";

import { useState } from "react";
import { ArrowDown, FileText, MessageSquare, Check } from "lucide-react";
import { LandingHeroActions } from "@/components/landing/landing-hero-actions";

const examples = {
  Backend: {
    bullet: "Built a payments service with Node.js, PostgreSQL, and Redis.",
    insight: "The stack is clear. Your decisions and their impact are missing.",
    question: "A payment webhook arrives twice. How does your service prevent a customer from being charged twice?",
    focus: ["Idempotency", "Database constraints", "Failure recovery"],
  },
  Frontend: {
    bullet: "Developed a React dashboard with real-time analytics and interactive charts.",
    insight: "You describe the interface. Be ready to explain how it holds up under load.",
    question: "Your dashboard receives hundreds of updates a second. How would you keep the charts responsive without dropping data?",
    focus: ["Render performance", "Update batching", "State management"],
  },
} as const;

export function LandingHero() {
  const [role, setRole] = useState<keyof typeof examples>("Backend");
  const example = examples[role];

  return (
    <section className="prep-hero">
      <div className="prep-hero-copy">
        <p className="mb-6 flex items-center gap-2 text-sm text-lc-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-lc-orange" aria-hidden />
          Your resume is the starting point
        </p>
        <h1>Own the story.<br />Ace the follow-up.</h1>
        <p className="prep-hero-description">
          You wrote the bullet. Now get ready to defend it. Turn your resume into
          focused interview questions, useful feedback, and a plan for what to practice next.
        </p>
        <LandingHeroActions />
        <p className="mt-5 text-xs text-lc-dim">PDF or pasted text. Choose your target role. Start with your Resume Score.</p>
        <div className="prep-hero-path" aria-label="Your preparation workflow">
          <span>Resume Score</span><span aria-hidden>/</span>
          <span>AI Insights</span><span aria-hidden>/</span><span>Interview practice</span>
        </div>
      </div>

      <aside className="prep-example" aria-label="Illustrative resume to interview example">
        <div className="prep-example-header">
          <span className="text-sm font-medium text-lc-text">From bullet to interview</span>
          <span className="text-xs text-lc-dim">Sample</span>
        </div>
        <div className="prep-example-roles" aria-label="Choose a sample role">
          {(Object.keys(examples) as Array<keyof typeof examples>).map((item) => (
            <button key={item} type="button" aria-pressed={role === item}
              onClick={() => setRole(item)} className={role === item ? "is-selected" : ""}>
              {item}
            </button>
          ))}
        </div>
        <div aria-live="polite" aria-atomic="true">
          <div className="prep-example-source">
            <p className="mb-3 flex items-center gap-2 text-xs text-lc-muted"><FileText size={14} aria-hidden /> On your resume</p>
            <blockquote>“{example.bullet}”</blockquote>
          </div>
          <div className="prep-example-insight">
            <ArrowDown size={16} className="shrink-0 text-lc-orange" aria-hidden />
            <p>{example.insight}</p>
          </div>
          <div className="prep-example-question">
            <p className="mb-4 flex items-center gap-2 text-xs text-lc-orange"><MessageSquare size={14} aria-hidden /> Be ready for this</p>
            <h2>{example.question}</h2>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
              {example.focus.map((focus) => <span key={focus} className="flex items-center gap-1.5 text-xs text-lc-muted"><Check size={12} aria-hidden />{focus}</span>)}
            </div>
          </div>
        </div>
        <p className="prep-example-footnote">Practice the decisions behind your work.</p>
      </aside>
    </section>
  );
}
