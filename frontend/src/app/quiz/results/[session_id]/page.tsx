import { QuizResultsClient } from "@/components/interview/quiz-results-client";
import { QuizPageShell } from "@/components/interview/quiz-ui";

type Props = {
  params: Promise<{ session_id: string }>;
};

export default async function QuizResultsPage(props: Props) {
  const { session_id } = await props.params;
  return (
    <QuizPageShell>
      <QuizResultsClient sessionId={session_id} />
    </QuizPageShell>
  );
}
