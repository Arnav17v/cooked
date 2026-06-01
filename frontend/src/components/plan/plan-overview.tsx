"use client";

import type { ActivePlanResponse, PrepPlanDayDto } from "@/lib/api";

type Props = {
  data: ActivePlanResponse;
  initiating: boolean;
  onInitiate: () => void;
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

export function PlanOverview({ data, initiating, onInitiate }: Props) {
  const { plan, days } = data;

  return (
    <div className="plan-timeline-wrap">
      <header className="plan-timeline-header">
        <p className="landing-section-eyebrow">Overview</p>
        <h1 className="plan-page-title">{plan.plan_title || `${plan.company_name} prep`}</h1>
        {plan.summary ? <p className="plan-page-desc">{plan.summary}</p> : null}
        <p className="plan-meta-line">
          {plan.company_name} · {plan.role} · Interview {plan.interview_date}
        </p>
        {plan.degraded_summary ? (
          <p className="plan-banner plan-banner--warn">
            AI was degraded for this plan — run a roast for sharper personalization next time.
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
          disabled={initiating}
          onClick={onInitiate}
        >
          {initiating ? "Preparing your first days…" : "Initiate plan"}
        </button>
        <p className="plan-initiate-hint">
          Builds detailed notes and tasks for today plus the next two days. Other days generate when
          you open them. You can still edit the overview above until you initiate.
        </p>
      </div>
    </div>
  );
}
