/** Session metadata written at quiz start (`quiz-start-client`) and read after scoring. */

export const QUIZ_SESSION_META_PREFIX = "cooked_interview_meta_v1_";

export type QuizSessionMeta = {
  resumeId: string;
  role: string;
  jobTargeted?: boolean;
  plan_module_id?: string;
  plan_id?: string;
  return_to?: string;
  origin?: "plan" | "dashboard" | "notes";
};

export function readQuizSessionMeta(sessionId: string): QuizSessionMeta | null {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem(QUIZ_SESSION_META_PREFIX + sessionId) ??
    window.sessionStorage.getItem(QUIZ_SESSION_META_PREFIX + sessionId);
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as QuizSessionMeta;
    const resumeId = typeof parsed.resumeId === "string" ? parsed.resumeId.trim() : "";
    const role = typeof parsed.role === "string" ? parsed.role.trim() : "";
    if (!resumeId || !role) return null;
    return parsed;
  } catch {
    return null;
  }
}
