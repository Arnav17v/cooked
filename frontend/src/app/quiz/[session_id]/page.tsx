import { Suspense } from "react";

import { MarketingNav } from "@/components/marketing-nav";
import { InterviewQuiz } from "@/components/interview/interview-quiz";

interface PageProps {
  params: Promise<{ session_id: string }>;
}

function QuizLoadingFallback() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <div
        className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-lc-border border-t-lc-orange"
        aria-hidden
      />
      <p className="mt-6 font-mono text-[13px] text-lc-muted">Loading quiz…</p>
    </div>
  );
}

export default async function QuizSessionPage(props: PageProps) {
  const { session_id } = await props.params;

  return (
    <main className="min-h-screen bg-lc-bg text-lc-text">
      <MarketingNav />
      <section className="border-b border-lc-border bg-lc-header">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <p className="font-mono text-[12px] uppercase tracking-wider text-lc-orange">{"// quiz"}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Resume quiz</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-7 text-lc-muted">
            Questions from your roast. Use Next until the last one, then Submit — your score and breakdown land
            at the end.
          </p>
        </div>
      </section>
      <Suspense fallback={<QuizLoadingFallback />}>
        <InterviewQuiz sessionId={session_id} />
      </Suspense>
    </main>
  );
}
