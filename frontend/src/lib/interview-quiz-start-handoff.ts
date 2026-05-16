/** One-shot payload: dashboard or quiz results writes this, `/quiz/start` reads and clears after use. */

export const QUIZ_START_HANDOFF_KEY = "cooked_quiz_start_handoff_v1";

export type QuizStartHandoff = {
  resumeId: string;
  role: string;
  /** When true, `POST /interview/start` uses `hard_mode: true`. */
  hard_mode?: boolean;
  /** Batch size: 3 (short), 10 (medium), or 20 (long). */
  question_count?: number;
};
