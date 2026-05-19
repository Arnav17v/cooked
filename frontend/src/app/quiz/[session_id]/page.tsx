import { Suspense } from "react";

import { InterviewQuiz } from "@/components/interview/interview-quiz";
import { QuizLoadingPanel, QuizPageShell } from "@/components/interview/quiz-ui";

import "../../landing-v3.css";

interface PageProps {
  params: Promise<{ session_id: string }>;
}

function QuizLoadingFallback() {
  return <QuizLoadingPanel title="Loading quiz…" />;
}

export default async function QuizSessionPage(props: PageProps) {
  const { session_id } = await props.params;

  return (
    <QuizPageShell
      showHero={false}
      title=""
      contentClassName="max-w-[1100px]"
    >
      <Suspense fallback={<QuizLoadingFallback />}>
        <InterviewQuiz sessionId={session_id} />
      </Suspense>
    </QuizPageShell>
  );
}
