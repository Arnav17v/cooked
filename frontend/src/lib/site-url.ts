/** Canonical public site URL (no trailing slash). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://getuncooked.pro"
).replace(/\/$/, "");

export function siteHostLabel(): string {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "getuncooked.pro";
  }
}
