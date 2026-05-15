import { Suspense } from "react";

import { MarketingNav } from "@/components/marketing-nav";
import { RoastDashboard } from "@/components/roast/roast-dashboard";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-lc-bg text-lc-text">
      <MarketingNav />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-5 md:py-10">
        <Suspense
          fallback={
            <div className="rounded-xl border border-lc-border bg-lc-surface p-10 text-center font-mono text-[13px] text-lc-muted">
              Loading dashboard…
            </div>
          }
        >
          <RoastDashboard />
        </Suspense>
      </div>
    </main>
  );
}
