"use client";

import { useState } from "react";

import { PlanModuleContent } from "@/components/plan/plan-module-content";

const SAMPLE_NOTES = [
  {
    id: "payments",
    title: "Payments bullet deep-dive",
    bullet: "Built payment processing service handling $2M monthly volume with Stripe webhooks",
    content: `## Pulled from your resume
> Built payment processing service handling $2M monthly volume with Stripe webhooks

## What interviewers will push on
Your bullet names **Stripe** and **volume** but not **idempotency**, **duplicate charges**, or **rollback** paths. Expect follow-ups on webhook retries and reconciliation.

## Talking points to add
- Idempotency key strategy on \`POST /charges\` and webhook dedupe table
- One incident: duplicate charge race — how you detected it and the **error-rate** delta after the fix
- Settlement flow: client → API → processor → webhook → ledger update

## Stronger rewrite
- Shipped idempotent payment ingestion for **$2M/mo** volume; cut duplicate-charge incidents **40%** via webhook dedupe and reconciliation jobs`,
  },
  {
    id: "dashboard",
    title: "Dashboard latency story",
    bullet: "Reduced dashboard load time by optimizing React renders and API batching",
    content: `## Pulled from your resume
> Reduced dashboard load time by optimizing React renders and API batching

## What interviewers will push on
**"Reduced"** without a baseline metric reads vague. They will ask **before/after**, **p95 latency**, and **what** you batched.

## Talking points to add
- Baseline: p95 **4.2s → 1.1s** on cold load (name the tool: Lighthouse, RUM, etc.)
- React: memoization, virtualized table, moved N+1 fetches to one batched GraphQL/REST call
- Tradeoff: slightly larger payload vs fewer round trips

## Stronger rewrite
- Cut dashboard p95 load **4.2s → 1.1s** by batching 12 API calls into 2 and virtualizing the metrics table`,
  },
  {
    id: "api",
    title: "API migration bullet",
    bullet: "Migrated monolith endpoints to Node microservices for the billing team",
    content: `## Pulled from your resume
> Migrated monolith endpoints to Node microservices for the billing team

## What interviewers will push on
Scope of **your** ownership vs the team. Boundary choices, data consistency, and how you rolled out without downtime.

## Talking points to add
- Strangler pattern: which endpoints moved first and why billing was isolated
- Shared DB vs event bus — what you chose and one failure mode you handled
- Rollout: feature flags, shadow traffic, or dual-write period

## Stronger rewrite
- Led migration of 8 billing endpoints to Node services; zero-downtime cutover with shadow traffic and dual-write for 2 weeks`,
  },
] as const;

export function LandingPlanNotesShowcase() {
  const [activeId, setActiveId] = useState<string>(SAMPLE_NOTES[0].id);
  const active = SAMPLE_NOTES.find((n) => n.id === activeId) ?? SAMPLE_NOTES[0];

  return (
    <div className="landing-plan-notes-showcase" aria-label="Sample resume-specific plan notes">
      <aside className="landing-plan-notes-list">
        <p className="plan-field-label">Notes from your resume</p>
        <ul>
          {SAMPLE_NOTES.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className={`landing-plan-notes-item${
                  note.id === activeId ? " landing-plan-notes-item--active" : ""
                }`}
                onClick={() => setActiveId(note.id)}
              >
                <span className="plan-curriculum-icon plan-curriculum-icon--notes" aria-hidden>
                  N
                </span>
                <span className="landing-plan-notes-item-text">
                  <span className="landing-plan-notes-item-title">{note.title}</span>
                  <span className="landing-plan-notes-item-bullet">&ldquo;{note.bullet}&rdquo;</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <article className="landing-plan-notes-panel plan-lesson-panel">
        <nav className="plan-lesson-breadcrumb" aria-label="Breadcrumb">
          <span>Day 1</span>
          <span className="plan-lesson-breadcrumb-sep" aria-hidden>
            ›
          </span>
          <span>Note</span>
          <span className="plan-lesson-breadcrumb-sep" aria-hidden>
            ›
          </span>
          <span className="plan-lesson-breadcrumb-current">{active.title}</span>
        </nav>

        <header className="plan-lesson-header">
          <span className="plan-module-kind">Note</span>
          <h2 className="plan-lesson-title">{active.title}</h2>
        </header>

        <div className="plan-lesson-body">
          <PlanModuleContent content={active.content} />
        </div>
      </article>
    </div>
  );
}
