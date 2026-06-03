import type { ResultTabId } from "@/components/roast/roast-shared";

export const DASHBOARD_NAV: { id: ResultTabId; label: string }[] = [
  { id: "score", label: "Resume Score" },
  { id: "insights", label: "AI Insights" },
  { id: "review", label: "In-Depth Analysis" },
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
