"use client";

import "@/app/landing-v3.css";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, FileText, Target, Award } from "lucide-react";
import { dashboardTabFromSearch, prepNavigation } from "@/lib/dashboard-nav";
import { LandingNavUserMenu } from "./landing-nav-user-menu";

const icons = [LayoutDashboard, FileText, Target, Award];

export function FloatingDock() {
  const pathname = usePathname();
  const search = useSearchParams();
  const resumeId = search.get("resume")?.trim() || null;
  const tab = pathname === "/dashboard" ? dashboardTabFromSearch(search.get("tab")) : null;
  return (
    <div className="landing-v3 prep-navigation">
      <nav aria-label="Main navigation">
        {prepNavigation(resumeId, pathname, tab).map((item, index) => {
          const Icon = icons[index];
          return <Link key={item.label} href={item.href} aria-current={item.active ? "page" : undefined}>
            <Icon size={20} aria-hidden="true" /><span>{item.label}</span>
          </Link>;
        })}
      </nav>
      <LandingNavUserMenu className="prep-navigation-account" />
    </div>
  );
}
