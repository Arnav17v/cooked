"use client";

import type { ActivePlanResponse, PrepPlanDayDto } from "@/lib/api";

type Props = {
  data: ActivePlanResponse;
  initiating: boolean;
  initiationRunning: boolean;
  initiationFailed: boolean;
  initiationError?: string | null;
  onInitiate: () => void;
  onGoToList: () => void;
};

function mergedSummary(day: PrepPlanDayDto): string {
  const parts = [day.morning_task?.trim(), day.evening_task?.trim()].filter(Boolean);
  return parts.join(" ");
}

function intensityClass(intensity: string): string {
  const i = intensity.toLowerCase();
  if (i === "heavy") return "plan-intensity plan-intensity--heavy";
  if (i === "light") return "plan-intensity plan-intensity--light";
  return "plan-intensity";
}

export function PlanOverview({
  data,
  initiating,
  initiationRunning,
  initiationFailed,
  initiationError,
  onInitiate,
  onGoToList,
}: Props) {
  const { plan, days } = data;

  return (
    <div className="plan-timeline-wrap">
      <header className="plan-timeline-header">
        <p className="landing-section-eyebrow">Overview</p>
        <h1 className="plan-page-title">{plan.plan_title || `${plan.company_name} prep`}</h1>
        {plan.summary ? <p className="plan-page-desc">{plan.summary}</p> : null}
        <p className="plan-meta-line">
          {plan.company_name} · {plan.role} · {days.length}-day prep plan
        </p>
        {plan.degraded_summary ? (
          <p className="plan-banner plan-banner--warn">
            AI was degraded for this plan — run a roast for sharper personalization next time.
          </p>
        ) : null}
        {initiationRunning ? (
          <p className="plan-banner plan-banner--info" role="status">
            Building your plan in the background.{" "}
            <button type="button" className="plan-inline-link-btn" onClick={onGoToList}>
              View all plans
            </button>{" "}
            for progress, or stay here and read the timeline.
          </p>
        ) : null}
        {initiationFailed && initiationError ? (
          <p className="plan-banner plan-banner--warn" role="alert">
            {initiationError}
          </p>
        ) : null}
      </header>

      <ol className="plan-timeline">
        {days.map((day) => (
          <li key={day.id} className="plan-day-card">
            <div className="plan-day-card-rail" aria-hidden />
            <div className="plan-day-card-body">
              <div className="plan-day-card-top">
                <span className="plan-day-date">
                  Day {day.day_number} · {day.date}
                </span>
                <span className={intensityClass(day.intensity)}>{day.intensity}</span>
              </div>
              <h2 className="plan-day-focus">{day.focus_area}</h2>
              <p className="plan-day-summary">{mergedSummary(day)}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="plan-initiate-wrap">
        <button
          type="button"
          className="plan-primary-btn plan-initiate-btn"
          disabled={initiating || initiationRunning}
          onClick={onInitiate}
        >
          {initiating
            ? "Starting…"
            : initiationRunning
              ? "Building plan…"
              : initiationFailed
                ? "Retry start plan"
                : "Start plan"}
        </button>
        <p className="plan-initiate-hint">
          {initiationRunning
            ? "We are generating notes and tasks for your first days. This continues if you leave the page."
            : "Starts building notes and tasks for today plus the next two days in the background. You will land on your plans list and can come back when it is ready."}
        </p>
      </div>
    </div>
  );
}
