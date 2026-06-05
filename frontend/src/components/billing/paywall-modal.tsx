"use client";

import Link from "next/link";

import type { PaymentRequiredError } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  error?: PaymentRequiredError | null;
  code?: string;
  message?: string;
  usage?: Record<string, unknown>;
};

function copyForCode(
  code: string | undefined,
  message: string | undefined,
  usage: Record<string, unknown> | undefined,
): string {
  if (message?.trim()) return message.trim();
  const current = typeof usage?.current === "number" ? usage.current : null;
  const limit = typeof usage?.limit === "number" ? usage.limit : null;
  switch (code) {
    case "resume_limit_reached":
      return `You've uploaded ${current ?? "?"}/${limit ?? "?"} resumes. Upgrade to Pro for unlimited uploads.`;
    case "quiz_limit_reached":
      return `You've used ${current ?? "?"}/${limit ?? "?"} quiz sessions for this resume. Upgrade to Pro for unlimited practice.`;
    case "plan_expired":
      return "Your free plan access has expired. Upgrade to Pro to keep your prep plan.";
    case "plan_limit_reached":
      return `You already have ${current ?? "?"}/${limit ?? "?"} prep plan${limit === 1 ? "" : "s"}. Upgrade to Pro for unlimited plans.`;
    case "indepth_locked":
      return "In-Depth Analysis is a Pro feature. Upgrade to unlock hiring-manager insights.";
    default:
      return "Upgrade to Pro to unlock this feature.";
  }
}

export function PaywallModal({ open, onClose, error, code, message, usage }: Props) {
  if (!open) return null;

  const resolvedCode = error?.code ?? code;
  const resolvedUsage = error?.usage ?? usage;
  const body = copyForCode(resolvedCode, error?.message ?? message, resolvedUsage);

  return (
    <div className="paywall-modal-root" role="presentation">
      <button type="button" className="paywall-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="paywall-modal-card" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
        <p className="paywall-modal-eyebrow">Pro feature</p>
        <h2 id="paywall-title" className="paywall-modal-title">
          Upgrade to Pro
        </h2>
        <p className="paywall-modal-body">{body}</p>
        <div className="paywall-modal-actions">
          <Link href="/upgrade" className="paywall-modal-cta" onClick={onClose}>
            Upgrade to Pro — $20/month
          </Link>
          <button type="button" className="paywall-modal-dismiss" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
