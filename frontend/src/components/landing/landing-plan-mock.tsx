"use client";

import { PlanModuleContent } from "@/components/plan/plan-module-content";

const PLAN_TITLE = "Stripe — Full Stack Engineer prep";

const SIDEBAR_DAYS = [
  {
    n: 1,
    date: "Jun 2",
    focus: "Payments & idempotency",
    today: true,
    expanded: true,
    count: "1/3 items",
    modules: [
      { kind: "note", title: "Payments bullet deep-dive", active: true, done: false },
      { kind: "task", title: "STAR: duplicate charge fix", active: false, done: false },
      { kind: "quiz", title: "System design warm-up", active: false, done: false },
    ],
  },
  {
    n: 2,
    date: "Jun 3",
    focus: "Metrics & tradeoffs",
    today: false,
    expanded: false,
    count: "0/3 items",
    modules: [],
  },
  {
    n: 3,
    date: "Jun 4",
    focus: "API design drill",
    today: false,
    expanded: false,
    count: "0/2 items",
    modules: [],
  },
] as const;

const ACTIVE_NOTE = `## What interviewers will push on
Your payments bullet invites questions on **idempotency**, duplicate charges, and rollback paths.

## Prep checklist
- Draw the request flow: client → API → processor → webhook
- Explain how you guarantee at-most-once settlement
- Name one production bug you fixed and the metric it moved
`;

function ModuleIcon({ kind }: { kind: string }) {
  const letter = kind === "task" ? "T" : kind === "quiz" ? "Q" : "N";
  return (
    <span className={`plan-curriculum-icon plan-curriculum-icon--${kind}`} aria-hidden>
      {letter}
    </span>
  );
}

export function LandingPlanMock() {
  return (
    <section className="landing-report-plan-mock" aria-label="Sample interview prep plan">
      <div className="landing-prep-stage">
        <div className="landing-prep-stage-chrome">
          <span className="landing-prep-stage-dot" />
          <span className="landing-prep-stage-dot" />
          <span className="landing-prep-stage-dot" />
          <span className="landing-prep-stage-url">isitcooked.vercel.app/plan</span>
        </div>

        <div className="landing-plan-mock-shell plan-coursera-split">
          <aside className="plan-curriculum landing-plan-mock-curriculum" aria-hidden>
            <div className="plan-curriculum-header">
              <p className="plan-field-label">Course content</p>
              <h2 className="plan-curriculum-title">{PLAN_TITLE}</h2>
              <div className="plan-curriculum-progress">
                <div className="plan-progress-track" aria-hidden>
                  <div className="plan-progress-fill" style={{ width: "18%" }} />
                </div>
                <p className="plan-progress-label">18% complete · 1/6 items</p>
              </div>
            </div>

            <nav className="plan-curriculum-days">
              {SIDEBAR_DAYS.map((day) => (
                <section
                  key={day.n}
                  className={`plan-curriculum-day${
                    day.expanded ? " plan-curriculum-day--expanded" : ""
                  }${day.today ? " plan-curriculum-day--today" : ""}`}
                >
                  <div className="plan-curriculum-day-header">
                    <span className="plan-curriculum-day-chevron" aria-hidden>
                      {day.expanded ? "▾" : "▸"}
                    </span>
                    <span className="plan-curriculum-day-heading">
                      <span className="plan-curriculum-day-label">
                        Day {day.n} · {day.date}
                      </span>
                      <span className="plan-curriculum-day-focus">{day.focus}</span>
                      <span className="plan-curriculum-day-meta">
                        {day.today ? <span className="plan-today-pill">Today</span> : null}
                        <span className="plan-curriculum-day-count">{day.count}</span>
                      </span>
                    </span>
                  </div>

                  {day.expanded && day.modules.length > 0 ? (
                    <ul className="plan-curriculum-items">
                      {day.modules.map((mod) => (
                        <li key={mod.title}>
                          <div
                            className={`plan-curriculum-item${
                              mod.active ? " plan-curriculum-item--active" : ""
                            }${mod.done ? " plan-curriculum-item--done" : ""}`}
                          >
                            <ModuleIcon kind={mod.kind} />
                            <span className="plan-curriculum-item-title">{mod.title}</span>
                            <span className="plan-curriculum-check" aria-hidden />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </nav>
          </aside>

          <div className="plan-lesson-main landing-plan-mock-lesson">
            <div className="plan-lesson-panel">
              <article className="plan-lesson-article">
                <nav className="plan-lesson-breadcrumb" aria-label="Breadcrumb">
                  <span>Day 1</span>
                  <span className="plan-lesson-breadcrumb-sep" aria-hidden>
                    ›
                  </span>
                  <span>Note</span>
                  <span className="plan-lesson-breadcrumb-sep" aria-hidden>
                    ›
                  </span>
                  <span className="plan-lesson-breadcrumb-current">Payments bullet deep-dive</span>
                </nav>

                <header className="plan-lesson-header">
                  <span className="plan-module-kind">Note</span>
                  <h1 className="plan-lesson-title">Payments bullet deep-dive</h1>
                </header>

                <div className="plan-lesson-body">
                  <PlanModuleContent content={ACTIVE_NOTE} />
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
