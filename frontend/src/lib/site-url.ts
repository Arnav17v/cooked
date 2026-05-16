/** Canonical public site URL (no trailing slash). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://isitcooked.vercel.app"
).replace(/\/$/, "");

export function siteHostLabel(): string {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "isitcooked.vercel.app";
  }
}
