"use client";

import type { FormEvent } from "react";

type Props = {
  companyName: string;
  role: string;
  interviewDate: string;
  jdText: string;
  loading: boolean;
  onCompanyName: (v: string) => void;
  onRole: (v: string) => void;
  onInterviewDate: (v: string) => void;
  onJdText: (v: string) => void;
  onSubmit: () => void;
};

export function PlanForm({
  companyName,
  role,
  interviewDate,
  jdText,
  loading,
  onCompanyName,
  onRole,
  onInterviewDate,
  onJdText,
  onSubmit,
}: Props) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <form className="plan-form" onSubmit={handleSubmit}>
      <p className="landing-section-eyebrow">Step 1</p>
      <h1 className="plan-page-title">Interview prep planner</h1>
      <p className="plan-page-desc">
        Company, role, interview date, and the job description. We&apos;ll build a day-by-day plan
        from your roast and resume.
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
          <span className="plan-field-label">Interview date</span>
          <input
            type="date"
            className="plan-input"
            value={interviewDate}
            min={minDate}
            onChange={(e) => onInterviewDate(e.target.value)}
            required
          />
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
        {loading ? "Generating plan…" : "Generate my plan"}
      </button>
    </form>
  );
}
