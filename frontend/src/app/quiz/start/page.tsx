import { Suspense } from "react";

import { MarketingNav } from "@/components/marketing-nav";
import { QuizStartClient } from "@/components/interview/quiz-start-client";

function StartFallback() {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <div
        className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-lc-border border-t-lc-orange"
        aria-hidden
      />
      <p className="mt-10 font-mono text-[14px] text-lc-muted">Loading…</p>
    </div>
  );
}

export default function QuizStartPage() {
  return (
    <main className="min-h-screen bg-lc-bg text-lc-text">
      <MarketingNav />
      <section className="border-b border-lc-border bg-lc-header">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <p className="font-mono text-[12px] uppercase tracking-wider text-lc-orange">{"// quiz"}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Starting your quiz</h1>
        </div>
      </section>
      <Suspense fallback={<StartFallback />}>
        <QuizStartClient />
      </Suspense>
    </main>
  );
}
