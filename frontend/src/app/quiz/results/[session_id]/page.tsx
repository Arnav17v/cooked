import { QuizResultsClient } from "@/components/interview/quiz-results-client";
import { QuizPageShell } from "@/components/interview/quiz-ui";

import "../../../landing-v3.css";

type Props = {
  params: Promise<{ session_id: string }>;
};

export default async function QuizResultsPage(props: Props) {
  const { session_id } = await props.params;
  return (
    <QuizPageShell
      title="Quiz analysis"
      showHero={false}
      contentClassName="max-w-[1100px]"
    >
      <QuizResultsClient sessionId={session_id} />
    </QuizPageShell>
  );
}
