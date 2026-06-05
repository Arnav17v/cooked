import Link from "next/link";

import { UpgradePanel } from "@/components/billing/upgrade-panel";

import "../landing-v3.css";

export const metadata = {
  title: "Pricing — Get Uncooked",
};

export default function PricingPage() {
  return (
    <div className="landing-v3">
      <main className="upgrade-page">
        <div className="upgrade-page-inner">
          <Link href="/dashboard" className="upgrade-page-back">
            ← Back to dashboard
          </Link>
          <UpgradePanel />
        </div>
      </main>
    </div>
  );
}
