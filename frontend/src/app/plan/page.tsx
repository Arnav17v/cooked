import { Suspense } from "react";

import { LandingCustomCursor } from "@/components/landing/landing-custom-cursor";
import { LandingNav } from "@/components/landing/landing-nav";
import { PlanClient } from "@/components/plan/plan-client";
import { DashboardSkeleton } from "@/components/roast/dashboard-skeleton";

import "../landing-v3.css";

export const metadata = {
  title: "Interview prep plan | Am I Cooked?",
  description: "Day-by-day interview prep tailored to your JD and resume.",
};

export default function PlanPage() {
  return (
    <div className="landing-v3 landing-dash-app">
      <LandingCustomCursor />
      <LandingNav />
      <div className="landing-page landing-dash-page">
        <Suspense fallback={<DashboardSkeleton />}>
          <PlanClient />
        </Suspense>
      </div>
    </div>
  );
}
