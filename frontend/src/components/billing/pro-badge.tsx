"use client";

import { useEntitlements, EntitlementsProvider } from "@/components/billing/entitlements-context";

function ProBadgeInner() {
  const { isPro, loading } = useEntitlements();
  if (loading || !isPro) return null;
  return (
    <span className="landing-nav-pro-badge text-black" aria-label="Pro subscriber">
      PRO
    </span>
  );
}

/** Drop this anywhere in the nav — self-contained, renders nothing for free users. */
export function ProBadge() {
  return (
    <EntitlementsProvider>
      <ProBadgeInner />
    </EntitlementsProvider>
  );
}
