"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";

import {
  buildDashboardHref,
  buildPlanHref,
  DASHBOARD_NAV,
  dashboardTabFromSearch,
} from "@/lib/dashboard-nav";

type Props = {
  onNavigate?: () => void;
  className?: string;
};

export function LandingNavLinks({ onNavigate, className = "" }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();

  const resumeId = searchParams.get("resume")?.trim() || null;
  const activeTab = pathname === "/dashboard" ? dashboardTabFromSearch(searchParams.get("tab")) : null;

  const linkClass = (active: boolean) =>
    `landing-nav-link${active ? " landing-nav-link--active" : ""}`;

  if (!isLoaded) {
    return <div className={className} aria-hidden />;
  }

  if (!isSignedIn) {
    return (
      <div className={className}>
        <Link href="/sign-in" className="landing-nav-link" onClick={onNavigate}>
          Log in
        </Link>
        <Link href="/roast" className="landing-nav-cta" onClick={onNavigate}>
          Start interview prep
        </Link>
      </div>
    );
  }

  const planActive = pathname === "/plan" || pathname.startsWith("/prep");

  return (
    <div className={`landing-nav-desktop--signed-in ${className}`.trim()}>
      {DASHBOARD_NAV.map(({ id, label }) => (
        <Link
          key={id}
          href={buildDashboardHref(resumeId, id)}
          className={linkClass(activeTab === id)}
          onClick={onNavigate}
        >
          {label}
        </Link>
      ))}
      <Link
        href={buildPlanHref(resumeId)}
        className={planActive ? "landing-nav-plan landing-nav-plan--active" : "landing-nav-plan"}
        onClick={onNavigate}
      >
        Plan
      </Link>
      <Link href="/roast?new=1" className="landing-nav-link landing-nav-upload" onClick={onNavigate}>
        upload new
      </Link>
    </div>
  );
}
