"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";

import {
  buildCheckoutUrl,
  isCheckoutConfigured,
  PRO_MONTHLY_PRICE_USD,
  proPriceLabel,
} from "@/lib/billing";
import {
  EntitlementsProvider,
  useEntitlements,
} from "@/components/billing/entitlements-context";

const PRO_FEATURES = [
  "Unlimited resume uploads",
  "Unlimited prep plans",
  "Unlimited practice quizzes per resume",
  "AI In-Depth Analysis",
  "Prep plan with no expiry",
] as const;

function UpgradePanelInner() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const { isPro, loading } = useEntitlements();

  const checkoutUrl = buildCheckoutUrl({
    clerkSubject: isSignedIn ? userId : null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
  });
  const checkoutReady = isCheckoutConfigured() && Boolean(checkoutUrl);

  return (
    <div className="upgrade-panel">
      <p className="upgrade-panel-eyebrow">Get Uncooked Pro</p>
      <h1 className="upgrade-panel-title">Unlock the full prep stack</h1>
      <p className="upgrade-panel-price">
        <span className="upgrade-panel-price-amount">${PRO_MONTHLY_PRICE_USD}</span>
        <span className="upgrade-panel-price-period">/month</span>
      </p>
      <ul className="upgrade-panel-list">
        {PRO_FEATURES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {/* ── CTA: already Pro ── */}
      {!loading && isPro ? (
        <>
          <div className="upgrade-panel-cta upgrade-panel-cta--pro" aria-disabled="true">
            ✓ You&apos;re already on Pro
          </div>
          <p className="upgrade-panel-note">
            Your Pro access is active.{" "}
            <Link href="/dashboard" className="upgrade-page-back">
              Go to dashboard →
            </Link>
          </p>
        </>
      ) : checkoutReady && checkoutUrl ? (
        /* ── CTA: subscribe ── */
        <>
          <a
            href={checkoutUrl}
            className="upgrade-panel-cta upgrade-panel-cta--active"
            target="_blank"
            rel="noopener noreferrer"
          >
            Subscribe — {proPriceLabel()}
          </a>
          <p className="upgrade-panel-note">
            Secure checkout via Lemon Squeezy. Sign in first so your account unlocks
            automatically after payment.
          </p>
        </>
      ) : (
        /* ── CTA: not configured ── */
        <>
          <button type="button" className="upgrade-panel-cta" disabled>
            Checkout not configured
          </button>
          <p className="upgrade-panel-note">
            Set <code>NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL</code> in{" "}
            <code>frontend/.env.local</code> to enable checkout.
          </p>
        </>
      )}

      {!isSignedIn && !loading ? (
        <p className="upgrade-panel-note">
          <Link href="/sign-in?redirect_url=/pricing" className="upgrade-page-back">
            Sign in
          </Link>{" "}
          before subscribing so Pro applies to your account.
        </p>
      ) : null}
    </div>
  );
}

export function UpgradePanel() {
  return (
    <EntitlementsProvider>
      <UpgradePanelInner />
    </EntitlementsProvider>
  );
}

