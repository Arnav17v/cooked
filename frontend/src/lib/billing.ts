/** Public billing config — safe for client bundles. */

export const PRO_MONTHLY_PRICE_USD = Number(
  process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_USD ?? "10",
);

const CHECKOUT_BASE = (
  process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL ?? ""
).trim();

export function isCheckoutConfigured(): boolean {
  return CHECKOUT_BASE.length > 0;
}

/** Lemon Squeezy checkout with optional Clerk identity for webhook matching. */
export function buildCheckoutUrl(opts?: {
  clerkSubject?: string | null;
  email?: string | null;
}): string | null {
  if (!CHECKOUT_BASE) return null;
  try {
    const url = new URL(CHECKOUT_BASE);
    const subject = opts?.clerkSubject?.trim();
    const email = opts?.email?.trim();
    if (subject) {
      url.searchParams.set("checkout[custom][clerk_subject]", subject);
    }
    if (email) {
      url.searchParams.set("checkout[email]", email);
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function proPriceLabel(): string {
  return `$${PRO_MONTHLY_PRICE_USD}/month`;
}
