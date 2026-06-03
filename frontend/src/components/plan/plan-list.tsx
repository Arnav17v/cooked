"use client";

import type { PrepPlanSummaryDto } from "@/lib/api";

type Props = {
  plans: PrepPlanSummaryDto[];
  deletingId: string | null;
  initiatingPlanId: string | null;
  onOpen: (planId: string) => void;
  onDelete: (planId: string) => void;
  onNewPlan: () => void;
  onRetryInitiate: (planId: string) => void;
};

function phaseLabel(plan: PrepPlanSummaryDto): string {
  if (plan.initiation_status === "running") return "Building plan";
  if (plan.initiation_status === "failed") return "Build failed";
  if (plan.status === "completed") return "Completed";
  if (plan.phase === "overview") return "Overview";
  return "In progress";
}

function phaseClass(plan: PrepPlanSummaryDto): string {
  if (plan.initiation_status === "running") return "plan-list-card-phase plan-list-card-phase--building";
  if (plan.initiation_status === "failed") return "plan-list-card-phase plan-list-card-phase--failed";
  return "plan-list-card-phase";
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="plan-progress-track plan-progress-track--sm">
      <div className="plan-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PlanList({
  plans,
  deletingId,
  initiatingPlanId,
  onOpen,
  onDelete,
  onNewPlan,
  onRetryInitiate,
}: Props) {
  return (
    <div className="plan-list-wrap">
      <header className="plan-list-header">
        <div>
          <p className="landing-section-eyebrow">Prep plans</p>
          <h1 className="plan-page-title">Your interview plans</h1>
          <p className="plan-page-desc">Create a plan per company or role. Open one to continue prep.</p>
        </div>
        <button type="button" className="plan-primary-btn" onClick={onNewPlan}>
          New plan
        </button>
      </header>

      {plans.length === 0 ? (
        <div className="plan-list-empty">
          <p>No plans yet. Create your first prep plan for an upcoming interview.</p>
          <button type="button" className="plan-primary-btn" onClick={onNewPlan}>
            Create a plan
          </button>
        </div>
      ) : (
        <ul className="plan-list">
          {plans.map((plan) => {
            const building = plan.initiation_status === "running";
            const failed = plan.initiation_status === "failed";
            const starting = initiatingPlanId === plan.id;

            return (
              <li key={plan.id} className="plan-list-card">
                <button
                  type="button"
                  className="plan-list-card-main"
                  onClick={() => onOpen(plan.id)}
                >
                  <div className="plan-list-card-top">
                    <h2 className="plan-list-card-title">
                      {plan.plan_title || `${plan.company_name} prep`}
                    </h2>
                    <span className={phaseClass(plan)}>
                      {starting && !building ? "Starting…" : phaseLabel(plan)}
                    </span>
                  </div>
                  <p className="plan-list-card-meta">
                    {plan.company_name} · {plan.role} · Interview {plan.interview_date}
                  </p>
                  {plan.summary ? <p className="plan-list-card-summary">{plan.summary}</p> : null}
                  {building ? (
                    <p className="plan-list-card-building-hint plan-list-card-building-hint--hot">
                      <span className="plan-list-building-spinner" aria-hidden />
                      Making your dad proud. You can leave this page and come back.
                    </p>
                  ) : null}
                  {failed && plan.initiation_error ? (
                    <p className="plan-list-card-error-hint">{plan.initiation_error}</p>
                  ) : null}
                  <div className="plan-list-card-progress">
                    <ProgressBar pct={plan.progress_pct} />
                    <span className="plan-list-card-pct">
                      {plan.phase === "execution" ? `${plan.progress_pct}%` : `${plan.days_count} days`}
                    </span>
                  </div>
                </button>
                {failed ? (
                  <button
                    type="button"
                    className="plan-secondary-btn plan-list-retry-btn"
                    disabled={starting}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetryInitiate(plan.id);
                    }}
                  >
                    {starting ? "Starting…" : "Retry start"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="plan-list-delete-btn"
                  disabled={deletingId === plan.id || building}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(plan.id);
                  }}
                >
                  {deletingId === plan.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
