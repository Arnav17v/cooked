"use client";

import type { FormEvent } from "react";

export const PLAN_MIN_DAYS = 1;
export const PLAN_MAX_DAYS = 8;
export const PLAN_DEFAULT_DAYS = 7;

type Props = {
  companyName: string;
  role: string;
  daysCount: number;
  jdText: string;
  loading: boolean;
  onCompanyName: (v: string) => void;
  onRole: (v: string) => void;
  onDaysCount: (v: number) => void;
  onJdText: (v: string) => void;
  onSubmit: () => void;
};

export function PlanForm({
  companyName,
  role,
  daysCount,
  jdText,
  loading,
  onCompanyName,
  onRole,
  onDaysCount,
  onJdText,
  onSubmit,
}: Props) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form className="plan-form" onSubmit={handleSubmit}>
      <p className="landing-section-eyebrow">Step 1</p>
      <h1 className="plan-page-title">Interview prep planner</h1>
      <p className="plan-page-desc">
        Company, role, how many prep days you want (up to {PLAN_MAX_DAYS}), and the job description.
        We&apos;ll build a day-by-day plan from your resume score and insights.
      </p>

      <div className="plan-form-grid">
        <label className="plan-field">
          <span className="plan-field-label">Company</span>
          <input
            className="plan-input"
            value={companyName}
            onChange={(e) => onCompanyName(e.target.value)}
            placeholder="e.g. Razorpay"
            required
            maxLength={200}
          />
        </label>
        <label className="plan-field">
          <span className="plan-field-label">Role</span>
          <input
            className="plan-input"
            value={role}
            onChange={(e) => onRole(e.target.value)}
            placeholder="e.g. Backend Engineer"
            required
            maxLength={128}
          />
        </label>
        <label className="plan-field plan-field--full">
          <span className="plan-field-label">Prep plan length</span>
          <select
            className="plan-input"
            value={daysCount}
            onChange={(e) => onDaysCount(Number(e.target.value))}
            required
          >
            {Array.from({ length: PLAN_MAX_DAYS }, (_, i) => i + PLAN_MIN_DAYS).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "day" : "days"}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-[12px] text-lc-dim">
            Day 1 starts today. Max {PLAN_MAX_DAYS} days per plan.
          </span>
        </label>
        <label className="plan-field plan-field--full">
          <span className="plan-field-label">Job description</span>
          <textarea
            className="plan-textarea"
            value={jdText}
            onChange={(e) => onJdText(e.target.value)}
            placeholder="Paste the full JD — requirements, stack, responsibilities…"
            rows={10}
            required
          />
        </label>
      </div>

      <button type="submit" className="plan-primary-btn" disabled={loading}>
        {loading ? (
          <>
            <span className="plan-list-building-spinner" aria-hidden />
            <span>Generating plan…</span>
          </>
        ) : (
          "Generate my plan"
        )}
      </button>
    </form>
  );
}
