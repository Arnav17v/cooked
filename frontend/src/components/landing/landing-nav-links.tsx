"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";

import { LandingNavUserMenu } from "@/components/landing/landing-nav-user-menu";
import {
  prepNavigation,
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
        <Link href="/#how" className="landing-nav-link" onClick={onNavigate}>
          How it works
        </Link>
        <Link href="/#sample" className="landing-nav-link" onClick={onNavigate}>
          Sample prep
        </Link>
        <Link href="/sign-in" className="landing-nav-link" onClick={onNavigate}>
          Log in
        </Link>
        <Link href="/roast" className="landing-nav-cta" onClick={onNavigate}>
          Start interview prep
        </Link>
      </div>
    );
  }


  return (
    <div className={`landing-nav-desktop--signed-in ${className}`.trim()}>
      {prepNavigation(resumeId, pathname, activeTab).map(({ href, label, active }) => (
        <Link key={label} href={href} className={linkClass(active)} aria-current={active ? "page" : undefined} onClick={onNavigate}>
          {label}
        </Link>
      ))}
      <LandingNavUserMenu onNavigate={onNavigate} />
    </div>
  );
}
