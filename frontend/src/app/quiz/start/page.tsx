import { Suspense } from "react";

import { QuizStartClient } from "@/components/interview/quiz-start-client";
import { QuizLoadingPanel, QuizPageShell } from "@/components/interview/quiz-ui";

import "../../landing-v3.css";

function StartFallback() {
  return <QuizLoadingPanel title="Loading…" />;
}

export default function QuizStartPage() {
  return (
    <QuizPageShell
      eyebrow="// interview"
      title="Start your quiz"
      description="Your roast is loaded. Run a standard quiz from resume + role, or paste a job description to prep for one specific company."
    >
      <Suspense fallback={<StartFallback />}>
        <QuizStartClient />
      </Suspense>
    </QuizPageShell>
  );
}