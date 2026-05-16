export const QUIZ_LENGTH_OPTIONS = [
  { id: "short" as const, count: 3, label: "Short", detail: "3 questions" },
  { id: "medium" as const, count: 10, label: "Medium", detail: "10 questions" },
  { id: "long" as const, count: 20, label: "Long", detail: "20 questions" },
];

export type QuizLengthId = (typeof QUIZ_LENGTH_OPTIONS)[number]["id"];

export function quizCountForLength(id: QuizLengthId): number {
  const hit = QUIZ_LENGTH_OPTIONS.find((o) => o.id === id);
  return hit?.count ?? 10;
}
