import { Suspense } from "react";

import { LandingCustomCursor } from "@/components/landing/landing-custom-cursor";
import { LandingNav } from "@/components/landing/landing-nav";
import { DashboardSkeleton } from "@/components/roast/dashboard-skeleton";
import { RoastDashboard } from "@/components/roast/roast-dashboard";

import "../landing-v3.css";

export default function DashboardPage() {
  return (
    <div className="landing-v3 landing-dash-app">
      <LandingCustomCursor />
      <LandingNav />

      <div className="landing-page landing-dash-page">
        <Suspense fallback={<DashboardSkeleton />}>
          <RoastDashboard />
        </Suspense>
      </div>
    </div>
  );
}
