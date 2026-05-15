import { Suspense } from "react";

import { MarketingNav } from "@/components/marketing-nav";
import { RoastUpload } from "@/components/roast/roast-upload";

export default function RoastPage() {
  return (
    <main className="min-h-screen bg-lc-bg text-lc-text">
      <MarketingNav />
      <section className="border-b border-lc-border bg-lc-header">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <p className="font-mono text-[12px] uppercase tracking-wider text-lc-orange">
            {"// upload"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Upload resume
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-7 text-lc-muted">
            Paste or upload a PDF, pick your role, run the pipeline. When the roast finishes you&apos;ll land on
            your dashboard with tabs for score (including improvements), questions, and notes.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <Suspense
          fallback={
            <div className="rounded-xl border border-lc-border bg-lc-surface p-10 text-center font-mono text-[13px] text-lc-muted">
              Loading…
            </div>
          }
        >
          <RoastUpload />
        </Suspense>
      </div>
    </main>
  );
}
