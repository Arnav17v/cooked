import type { ResultTabId } from "@/components/roast/roast-shared";

export const DASHBOARD_NAV: { id: ResultTabId; label: string }[] = [
  { id: "score", label: "Score" },
  { id: "insights", label: "Insight" },
  { id: "review", label: "Analysis" },
  { id: "questions", label: "Practice" },
  { id: "notes", label: "Notes" },
];

const TAB_IDS = new Set<ResultTabId>(DASHBOARD_NAV.map((t) => t.id));

export function isDashboardTab(value: string | null): value is ResultTabId {
  return value !== null && TAB_IDS.has(value as ResultTabId);
}

export function dashboardTabFromSearch(value: string | null): ResultTabId {
  return isDashboardTab(value) ? value : "score";
}

export function buildDashboardHref(
  resumeId: string | null | undefined,
  tab: ResultTabId = "score",
): string {
  const q = new URLSearchParams();
  if (resumeId) q.set("resume", resumeId);
  if (tab !== "score") q.set("tab", tab);
  const s = q.toString();
  return s ? `/dashboard?${s}` : "/dashboard";
}

export function buildPlanHref(resumeId: string | null | undefined): string {
  if (resumeId) return `/plan?resume=${encodeURIComponent(resumeId)}`;
  return "/plan";
}

/** The same four destinations on desktop and mobile. Report keeps its own subnavigation. */
export function prepNavigation(resumeId: string | null, pathname: string, tab: ResultTabId | null) {
  return [
    { label: "Plan", href: buildPlanHref(resumeId), active: pathname === "/plan" || pathname.startsWith("/prep") },
    { label: "Notes", href: buildDashboardHref(resumeId, "notes"), active: pathname === "/notes" || tab === "notes" },
    { label: "Practice", href: buildDashboardHref(resumeId, "questions"), active: pathname.startsWith("/quiz") || pathname === "/interview" || tab === "questions" },
    { label: "Report", href: buildDashboardHref(resumeId), active: pathname === "/roast" || (tab !== null && ["score", "insights", "review"].includes(tab)) },
  ];
}

export function quizReturnHref(returnTo: string | undefined, resumeId?: string): string {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    try {
      const url = new URL(returnTo, "https://local.invalid");
      if (url.origin === "https://local.invalid" && ["/dashboard", "/plan"].includes(url.pathname)) {
        return url.pathname + url.search;
      }
    } catch { /* Use the known practice destination. */ }
  }
  return buildDashboardHref(resumeId, "questions");
}
