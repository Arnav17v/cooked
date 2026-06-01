/** One-shot payload: dashboard or quiz results writes this, `/quiz/start` reads and clears after use. */

export const QUIZ_START_HANDOFF_KEY = "cooked_quiz_start_handoff_v1";

export type QuizStartHandoff = {
  resumeId: string;
  role: string;
  /** When true, `POST /interview/start` uses `hard_mode: true`. */
  hard_mode?: boolean;
  /** Batch size: 3 (short), 10 (medium), or 20 (long). */
  question_count?: number;
  /** Prep plan day — link quiz session after start. */
  plan_day_id?: string;
  /** Prep plan module — link quiz session after start. */
  plan_module_id?: string;
  /** Prep plan id — return navigation after quiz. */
  plan_id?: string;
  /** Post-quiz redirect (e.g. `/plan?plan=<uuid>`). */
  return_to?: string;
  /** Where the quiz was started — controls post-score UX. */
  origin?: "plan" | "dashboard" | "notes";
  /** Prefill JD on `/quiz/start` (e.g. from plan day focus + topics). */
  job_description?: string;
};
