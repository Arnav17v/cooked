/** Typed FastAPI client. Never import an LLM SDK here — only backend HTTP. */

import { getOrCreateAnonymousClientId } from "./anonymous-client";
import type { ScoreDimensionsPayload } from "@/lib/score-dimensions";

export type ApiAuth = {
  /** Clerk session JWT (`getToken()`); when set, resume rows are owner-scoped server-side. */
  token?: string | null;
};

function headersWithAuth(token?: string | null): HeadersInit {
  if (!token?.trim()) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Bearer when signed in; otherwise stable anon id so repeat uploads reuse one DB user. */
function buildAuthAndAnonHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  const auth = headersWithAuth(token);
  if (auth && typeof auth === "object" && !Array.isArray(auth)) {
    Object.assign(h, auth as Record<string, string>);
  }
  if (!token?.trim() && typeof window !== "undefined") {
    h["X-Cooked-Anonymous-Id"] = getOrCreateAnonymousClientId();
  }
  return h;
}

function jsonPostHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const more = headersWithAuth(token);
  if (more && typeof more === "object" && !Array.isArray(more)) {
    Object.assign(h, more as Record<string, string>);
  }
  return h;
}

export function getApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000"
  );
}

/** Turn FastAPI ``{"detail": "…"}`` (or plain text) into a short user-facing message. */
export function formatApiError(body: string, fallback: string): string {
  const trimmed = body.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed) as { detail?: unknown };
    const d = parsed.detail;
    if (typeof d === "string" && d.trim()) return d.trim();
    if (Array.isArray(d)) {
      const parts = d
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg?: string }).msg ?? "");
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length) return parts.join(" ");
    }
  } catch {
    /* not JSON */
  }
  if (trimmed.length > 240 || trimmed.startsWith("<")) return fallback;
  return trimmed;
}

export type UploadResumeResponse = {
  resume_id: string;
  truncated: boolean;
  word_count: number;
  extracted_text_preview?: string;
};

export type EnqueueAnalyzeResponse = {
  analysis_id: string;
  resume_id: string;
  share_slug: string;
};

export type QuizScoreHistoryEntry = {
  final_score: number;
  at: string;
  session_id?: string;
};

export type QuizHistorySessionItem = {
  session_id: string;
  final_score: number;
  heat_label: string;
  one_liner: string | null;
  completed_at: string | null;
  question_count: number;
  has_full_results: boolean;
};

export type QuizHistoryResponse = {
  sessions: QuizHistorySessionItem[];
};

export type HireSignal = "strong" | "moderate" | "weak" | "pass";
export type InterviewDangerLevel = "high" | "medium" | "low";

export type InDepthAnalysis = {
  market_positioning: {
    percentile: number;
    percentile_label: string;
    positioning_summary: string;
    ceiling: string;
  };
  hiring_manager_read: {
    first_impression: string;
    inner_monologue: string;
    hire_signal: HireSignal;
    hire_reasoning: string;
  };
  interview_forecast: Array<{
    topic: string;
    reason: string;
    likely_question: string;
    danger_level: InterviewDangerLevel;
  }>;
  competitive_gap: {
    vs_top_10_percent: string;
    quickest_gap_to_close: string;
    hardest_gap_to_close: string;
  };
  highest_leverage_rewrite: {
    original: string;
    rewritten: string;
    why_this_one: string;
  };
  thirty_day_plan: {
    week_1: string;
    week_2: string;
    week_3: string;
    week_4: string;
    north_star: string;
  };
  _prompt_version?: string;
  analyze_degraded?: boolean;
};

export type InDepthGetResponse =
  | {
      status: "ready";
      analysis_id: string;
      indepth_analysis: InDepthAnalysis;
      indepth_generated_at: string | null;
      degraded: boolean;
    }
  | {
      status: "not_generated";
      analysis_id: string;
    };

export type ScoreResponse = {
  analysis_id?: string;
  indepth_ready?: boolean;
  cooked_score: number | null;
  score?: number | null;
  heat_label?: string | null;
  headline?: string | null;
  one_liner?: string | null;
  role?: string | null;
  score_breakdown: Record<string, unknown>;
  score_dimensions?: ScoreDimensionsPayload;
  ai_in_depth_review?: string | null;
  share_slug: string;
  degraded: boolean;
  resume_has_pdf?: boolean;
  resume_text_preview?: string | null;
  /** Mock quiz scores for this resume (DB). */
  interview_quiz_scores?: QuizScoreHistoryEntry[];
};

export type RedFlagStructured = {
  source_bullet: string;
  issue: string;
  suggested_rewrite: string;
};

export type FlagsResponse = {
  red_flags?: unknown[];
  flags?: unknown[];
  ai_insights?: unknown[];
  rewritten_bullets: string[];
  share_slug: string;
};

export type QuestionItem = {
  question: string;
  category: string;
  source_bullet: string | null;
  difficulty: string;
  /** from_resume = grounded in what they wrote; gap = missing / holes */
  bucket?: string;
};

export type QuestionsResponse = {
  questions: QuestionItem[];
  share_slug: string;
  degraded: boolean;
};

export type MyRoastItem = {
  resume_id: string;
  target_role: string;
  resume_created_at: string;
  analysis_id: string | null;
  analysis_status: string | null;
  share_slug: string | null;
  cooked_score: number | null;
};

export type ShareInsightPreview = {
  issue: string;
  suggested_rewrite: string;
};

export type SharePayload = {
  share_slug: string;
  target_role: string;
  role?: string;
  cooked_score: number | null;
  score?: number | null;
  heat_label?: string | null;
  headline?: string | null;
  one_liner?: string | null;
  score_dimensions?: ScoreDimensionsPayload;
  ai_insights_preview?: ShareInsightPreview[];
  degraded: boolean;
};

/** SSE events from `/api/v1/resume/.../events` — `step`-first wire format */
export type LlmDevTraceEvent = {
  kind: string;
  task?: string;
  model?: string;
  from_model?: string;
  to_model?: string;
  provider?: string;
  from_provider?: string;
  to_provider?: string;
  reason?: string;
  degraded?: boolean;
  chain_index?: number;
};

export type AnalysisEventPayload =
  | {
      step: "extracting" | "scoring" | "flagging" | "questions";
    }
  | { step: "llm_dev" } & LlmDevTraceEvent
  | {
      step: "done";
      resume_id: string;
      share_slug?: string;
      cooked_score?: number | null;
      heat_label?: string | null;
      headline?: string | null;
      degraded?: boolean;
    }
  | { step: "error"; reason: string };

export async function uploadResumeMultipart(
  form: FormData,
  auth?: ApiAuth,
): Promise<UploadResumeResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/resume/upload`, {
    method: "POST",
    headers: buildAuthAndAnonHeaders(auth?.token),
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as UploadResumeResponse;
}

export async function enqueueAnalyze(
  resumeId: string,
  auth?: ApiAuth,
): Promise<EnqueueAnalyzeResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/resume/${resumeId}/analyze`, {
    method: "POST",
    headers: headersWithAuth(auth?.token),
  });
  if (res.status === 429) {
    const body = await res.text();
    throw new RateLimitedError(body || "Daily analysis limit reached.");
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as EnqueueAnalyzeResponse;
}

export class RateLimitedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitedError";
  }
}

export function openAnalysisEventSource(
  resumeId: string,
  analysisId: string,
): EventSource {
  const url = `${getApiBase()}/api/v1/resume/${resumeId}/analysis/${analysisId}/events`;
  return new EventSource(url);
}

export async function getScore(resumeId: string, auth?: ApiAuth): Promise<ScoreResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/resume/${resumeId}/score`, {
    headers: headersWithAuth(auth?.token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status}`);
  }
  return (await res.json()) as ScoreResponse;
}

export async function fetchInDepthAnalysis(
  resumeId: string,
  auth?: ApiAuth,
): Promise<InDepthGetResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/resume/${resumeId}/indepth`, {
    headers: headersWithAuth(auth?.token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as InDepthGetResponse;
}

export async function generateInDepthAnalysis(
  resumeId: string,
  analysisId: string,
  auth?: ApiAuth,
  opts?: { regenerate?: boolean; jobDescription?: string },
): Promise<Extract<InDepthGetResponse, { status: "ready" }>> {
  const q = opts?.regenerate ? "?regenerate=true" : "";
  const res = await fetch(
    `${getApiBase()}/api/v1/resume/${resumeId}/analysis/${analysisId}/indepth${q}`,
    {
      method: "POST",
      headers: jsonPostHeaders(auth?.token),
      body: JSON.stringify({
        regenerate: Boolean(opts?.regenerate),
        job_description: opts?.jobDescription?.trim() || null,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, "Could not generate in-depth analysis"));
  }
  return (await res.json()) as Extract<InDepthGetResponse, { status: "ready" }>;
}

export async function fetchResumePdfBlob(
  resumeId: string,
  auth?: ApiAuth,
): Promise<Blob> {
  const res = await fetch(`${getApiBase()}/api/v1/resume/${resumeId}/pdf`, {
    headers: headersWithAuth(auth?.token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status}`);
  }
  return res.blob();
}

export async function getFlags(resumeId: string, auth?: ApiAuth): Promise<FlagsResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/resume/${resumeId}/flags`, {
    headers: headersWithAuth(auth?.token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status}`);
  }
  return (await res.json()) as FlagsResponse;
}

export async function getQuestions(
  resumeId: string,
  auth?: ApiAuth,
): Promise<QuestionsResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/resume/${resumeId}/questions`, {
    headers: headersWithAuth(auth?.token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status}`);
  }
  return (await res.json()) as QuestionsResponse;
}

export async function fetchMyRoasts(token: string): Promise<MyRoastItem[]> {
  const res = await fetch(`${getApiBase()}/api/v1/me/roasts`, {
    headers: headersWithAuth(token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status}`);
  }
  const data = (await res.json()) as { items: MyRoastItem[] };
  return data.items;
}

/** Server-side fetch for `/share` + OG — prefers `BACKEND_URL`, falls back to public URL. */
export function getServerApiBase(): string {
  return (
    process.env.BACKEND_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:8000"
  );
}

export async function fetchSharePayload(slug: string): Promise<SharePayload | null> {
  const res = await fetch(`${getServerApiBase()}/api/v1/share/${slug}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<SharePayload>;
}

// --- Interview quiz ---

export type InterviewFirstQuestion = {
  question: string;
  difficulty: string;
  bucket: string;
  /** When prep notes exist, which section this question was grounded in (UUID). */
  source_note_section_id?: string | null;
  /** Semantic tag from prep notes (e.g. experience:0, skills). */
  source_note_section_tag?: string | null;
  /** Present on job-targeted quizzes — why this question fits the role/JD. */
  why?: string | null;
  question_type?: string | null;
};

export type InterviewStartResponse = {
  session_id: string;
  questions: InterviewFirstQuestion[];
  job_targeted?: boolean;
  dev_llm_trace?: LlmDevTraceEvent[];
};

export type InterviewPerAnswerFeedback = {
  n: number;
  signal: "green" | "yellow" | "red";
  highlight_quote: string;
  analysis: string;
};

export type QuizResultsResponse = {
  session_id: string;
  resume_id: string;
  final_score: number;
  heat_label: string;
  one_liner: string | null;
  per_answer: InterviewPerAnswerFeedback[];
  questions: InterviewFirstQuestion[];
  answers: string[];
  completed_at: string | null;
};

export type InterviewScoreResponse = {
  session_id?: string;
  final_score: number;
  heat_label: string;
  one_liner: string | null;
  per_answer?: InterviewPerAnswerFeedback[];
  interview_quiz_scores?: QuizScoreHistoryEntry[];
  dev_llm_trace?: LlmDevTraceEvent[];
};

export type InterviewGrade = {
  score: number;
  verdict: string;
  what_they_missed: string | null;
};

export type InterviewAnswerResponse = {
  grade: InterviewGrade;
  next_question: InterviewFirstQuestion | null;
  session_complete: boolean;
  final_summary?: Record<string, unknown> | null;
};

export async function startInterviewQuiz(
  resumeId: string,
  role: string,
  auth?: ApiAuth,
  hardMode = false,
  questionCount = 10,
  jobDescription?: string | null,
): Promise<InterviewStartResponse> {
  const body: Record<string, unknown> = {
    resume_id: resumeId,
    role,
    hard_mode: hardMode,
    question_count: questionCount,
  };
  const jd = jobDescription?.trim();
  if (jd) {
    body.job_description = jd;
  }
  const res = await fetch(`${getApiBase()}/api/v1/interview/start`, {
    method: "POST",
    headers: jsonPostHeaders(auth?.token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as InterviewStartResponse;
}

export async function scoreInterviewQuiz(
  sessionId: string,
  answers: string[],
  auth?: ApiAuth,
  planModuleId?: string,
): Promise<InterviewScoreResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/interview/score`, {
    method: "POST",
    headers: jsonPostHeaders(auth?.token),
    body: JSON.stringify({
      session_id: sessionId,
      answers,
      ...(planModuleId?.trim() ? { plan_module_id: planModuleId.trim() } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `Scoring failed (${res.status})`));
  }
  return (await res.json()) as InterviewScoreResponse;
}

export async function submitInterviewAnswer(
  sessionId: string,
  answer: string,
  auth?: ApiAuth,
): Promise<InterviewAnswerResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/interview/answer`, {
    method: "POST",
    headers: jsonPostHeaders(auth?.token),
    body: JSON.stringify({ session_id: sessionId, answer }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as InterviewAnswerResponse;
}

export async function fetchInterviewSummary(
  sessionId: string,
  auth?: ApiAuth,
): Promise<QuizResultsResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/interview/summary/${sessionId}`, {
    headers: headersWithAuth(auth?.token),
  });
  if (res.status === 404) {
    throw new Error("Summary not available yet.");
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as QuizResultsResponse;
}

export async function fetchQuizHistory(
  resumeId: string,
  auth?: ApiAuth,
): Promise<QuizHistoryResponse> {
  const q = new URLSearchParams({ resume_id: resumeId });
  const res = await fetch(`${getApiBase()}/api/v1/interview/history?${q}`, {
    headers: headersWithAuth(auth?.token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as QuizHistoryResponse;
}

export async function fetchQuizResults(
  sessionId: string,
  auth?: ApiAuth,
): Promise<QuizResultsResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/interview/results/${sessionId}`, {
    headers: headersWithAuth(auth?.token),
  });
  if (res.status === 404) {
    throw new Error("Quiz results not found.");
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as QuizResultsResponse;
}

// --- Interview prep notes ---

export type NotesSectionDto = {
  section_id: string;
  /** experience | project | skills | certifications | other */
  section_kind?: string;
  /** Stable tag within this notes doc, aligned with quiz tagging (e.g. experience:0, skills). */
  section_tag?: string | null;
  title: string;
  content: string;
  display_order: number;
  weak_indicator: boolean;
  avg_score: number | null;
};

export type NotesGetResponse = {
  notes_id: string;
  resume_id: string;
  updated_at: string | null;
  sections: NotesSectionDto[];
};

export async function getNotes(resumeId: string, auth?: ApiAuth): Promise<NotesGetResponse | null> {
  const res = await fetch(`${getApiBase()}/api/v1/notes/${resumeId}`, {
    headers: headersWithAuth(auth?.token),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as NotesGetResponse;
}

export class NotesAlreadyExistError extends Error {
  readonly notesId: string;

  constructor(notesId: string) {
    super("Notes already exist");
    this.name = "NotesAlreadyExistError";
    this.notesId = notesId;
  }
}

export async function generateNotes(resumeId: string, auth?: ApiAuth): Promise<NotesGetResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/notes/generate`, {
    method: "POST",
    headers: jsonPostHeaders(auth?.token),
    body: JSON.stringify({ resume_id: resumeId }),
  });
  if (res.status === 409) {
    let notesId = "";
    try {
      const body = (await res.json()) as { detail?: { notes_id?: string } | string };
      const d = body?.detail;
      if (typeof d === "object" && d?.notes_id) notesId = String(d.notes_id);
    } catch {
      /* */
    }
    throw new NotesAlreadyExistError(notesId);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as NotesGetResponse;
}

/** Dev / backend-gated: delete existing prep notes and regenerate (POST /notes/renew). */
export async function renewNotes(resumeId: string, auth?: ApiAuth): Promise<NotesGetResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/notes/renew`, {
    method: "POST",
    headers: jsonPostHeaders(auth?.token),
    body: JSON.stringify({ resume_id: resumeId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as NotesGetResponse;
}

export async function patchNotesSection(
  sectionId: string,
  content: string,
  auth?: ApiAuth,
): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/v1/notes/section/${sectionId}`, {
    method: "PATCH",
    headers: jsonPostHeaders(auth?.token),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
}

/** Fire-and-forget post-quiz notes refresh (backend runs in BackgroundTasks). */
export function kickoffNotesPostQuizUpdate(
  resumeId: string,
  sessionId: string,
  auth?: ApiAuth,
): void {
  const url = `${getApiBase()}/api/v1/notes/update`;
  const body = JSON.stringify({ resume_id: resumeId, session_id: sessionId });
  const headers = jsonPostHeaders(auth?.token);
  void fetch(url, {
    method: "POST",
    headers,
    body,
    keepalive: true,
  }).catch(() => {
    /* ignore */
  });
}

// --- Seminar ---

export type SeminarStatus = "draft" | "live" | "full" | "completed";

export type SeminarSessionDto = {
  id: string;
  title: string;
  description: string;
  host_name: string;
  host_role: string;
  host_company: string;
  host_linkedin: string;
  host_image_url: string | null;
  date_time: string;
  duration_minutes: number;
  venue: string;
  spots_total: number;
  spots_remaining: number;
  price_inr: number;
  razorpay_link: string;
  banner_image_url: string | null;
  tags: string[];
  status: SeminarStatus;
  created_at: string;
};

export type CreateSeminarPayload = {
  title: string;
  description: string;
  host_name: string;
  host_role: string;
  host_company: string;
  host_linkedin: string;
  host_image_url?: string | null;
  date_time: string;
  duration_minutes: number;
  venue: string;
  spots_total: number;
  spots_remaining: number;
  price_inr: number;
  razorpay_link: string;
  banner_image_url?: string | null;
  tags: string[];
  status: SeminarStatus;
};

export async function getPublicSeminarSessions(): Promise<SeminarSessionDto[]> {
  const res = await fetch(`${getApiBase()}/api/v1/seminar/public`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  const data = (await res.json()) as { sessions: SeminarSessionDto[] };
  return data.sessions;
}

export async function getSeminarSessionById(id: string): Promise<SeminarSessionDto | null> {
  const res = await fetch(`${getApiBase()}/api/v1/seminar/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  const data = (await res.json()) as { seminar: SeminarSessionDto };
  return data.seminar;
}

export async function getLiveSeminarSession(): Promise<SeminarSessionDto | null> {
  const res = await fetch(`${getApiBase()}/api/v1/seminar/live`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  const data = (await res.json()) as { seminar: SeminarSessionDto | null };
  return data.seminar;
}

export async function getAllSeminarSessions(): Promise<{ sessions: SeminarSessionDto[] }> {
  const res = await fetch(`${getApiBase()}/api/v1/seminar/all`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as { sessions: SeminarSessionDto[] };
}

export async function createSeminarSession(
  payload: CreateSeminarPayload,
): Promise<{ seminar: SeminarSessionDto }> {
  const res = await fetch(`${getApiBase()}/api/v1/seminar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as { seminar: SeminarSessionDto };
}

export async function updateSeminarSession(
  id: string,
  payload: Partial<CreateSeminarPayload>,
): Promise<{ seminar: SeminarSessionDto }> {
  const res = await fetch(`${getApiBase()}/api/v1/seminar/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as { seminar: SeminarSessionDto };
}

// --- Prep plan ---

export type PrepPlanStatus = "active" | "completed" | "abandoned";
export type PrepPlanPhase = "overview" | "execution";

export type PrepPlanInitiationStatus = "idle" | "running" | "failed";
export type PlanModuleKind = "notes" | "task" | "quiz";

export type PlanDayModulesStatus = "pending" | "generating" | "ready" | "failed";

export type PlanModuleDto = {
  id: string;
  display_order: number;
  kind: PlanModuleKind;
  title: string;
  content: string | null;
  link_url: string | null;
  quiz_topics: string[];
  quiz_session_id: string | null;
  quiz_score: number | null;
  quiz_heat_label: string | null;
  quiz_one_liner: string | null;
  completed: boolean;
  completed_at: string | null;
  is_backlog: boolean;
};

export type PrepPlanDayDto = {
  id: string;
  day_number: number;
  date: string;
  focus_area: string;
  morning_task: string;
  evening_task: string;
  completed: boolean;
  quiz_session_id: string | null;
  quiz_topics: string[];
  intensity: string;
  is_today: boolean;
  is_backlog: boolean;
  progress_pct: number;
  modules_status: PlanDayModulesStatus;
  modules_error: string | null;
  modules: PlanModuleDto[];
};

export type PrepPlanDto = {
  id: string;
  resume_id: string;
  company_name: string;
  role: string;
  interview_date: string;
  status: PrepPlanStatus;
  phase: PrepPlanPhase;
  plan_title: string | null;
  summary: string | null;
  prompt_version: string;
  created_at: string;
  updated_at: string;
  degraded_summary?: boolean;
  backlog_count: number;
  initiation_status?: PrepPlanInitiationStatus;
  initiation_error?: string | null;
};

export type PrepPlanSummaryDto = {
  id: string;
  resume_id: string;
  company_name: string;
  role: string;
  interview_date: string;
  status: PrepPlanStatus;
  phase: PrepPlanPhase;
  plan_title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  days_count: number;
  progress_pct: number;
  initiation_status?: PrepPlanInitiationStatus;
  initiation_error?: string | null;
};

export type PrepPlanInitiateResponse = {
  plan_id: string;
  initiation_status: PrepPlanInitiationStatus;
};

export type PrepPlanListResponse = {
  plans: PrepPlanSummaryDto[];
};

export type ActivePlanResponse = {
  plan: PrepPlanDto;
  days: PrepPlanDayDto[];
};

export type GeneratePlanPayload = {
  resume_id: string;
  company_name: string;
  role: string;
  days_count: number;
  jd_text: string;
  experience_level?: string;
};

export async function listPrepPlans(token: string): Promise<PrepPlanListResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/list`, {
    headers: headersWithAuth(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as PrepPlanListResponse;
}

export async function getPrepPlan(planId: string, token: string): Promise<ActivePlanResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/${planId}`, {
    headers: headersWithAuth(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as ActivePlanResponse;
}

export async function getActivePrepPlan(token: string): Promise<ActivePlanResponse | null> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/active`, {
    headers: headersWithAuth(token),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as ActivePlanResponse;
}

export async function generatePrepPlan(
  payload: GeneratePlanPayload,
  token: string,
): Promise<ActivePlanResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/generate`, {
    method: "POST",
    headers: jsonPostHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as ActivePlanResponse;
}

export async function modifyPrepPlan(
  planId: string,
  natural_language_instruction: string,
  token: string,
): Promise<ActivePlanResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/${planId}/modify`, {
    method: "PATCH",
    headers: jsonPostHeaders(token),
    body: JSON.stringify({ natural_language_instruction }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as ActivePlanResponse;
}

export async function initiatePrepPlan(
  planId: string,
  token: string,
): Promise<PrepPlanInitiateResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/${planId}/initiate`, {
    method: "POST",
    headers: jsonPostHeaders(token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as PrepPlanInitiateResponse;
}

export async function generatePrepPlanDayModules(
  dayId: string,
  token: string,
): Promise<ActivePlanResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/day/${dayId}/generate-modules`, {
    method: "POST",
    headers: jsonPostHeaders(token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as ActivePlanResponse;
}

export async function completePrepPlanModule(
  moduleId: string,
  token: string,
): Promise<ActivePlanResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/module/${moduleId}/complete`, {
    method: "PATCH",
    headers: jsonPostHeaders(token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as ActivePlanResponse;
}

export async function linkPrepPlanModuleQuiz(
  moduleId: string,
  sessionId: string,
  token: string,
): Promise<ActivePlanResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/module/${moduleId}/link-quiz`, {
    method: "POST",
    headers: jsonPostHeaders(token),
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as ActivePlanResponse;
}

export async function completePrepPlanDay(dayId: string, token: string): Promise<ActivePlanResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/day/${dayId}/complete`, {
    method: "PATCH",
    headers: jsonPostHeaders(token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as ActivePlanResponse;
}

export async function linkPrepPlanDayQuiz(
  dayId: string,
  sessionId: string,
  token: string,
): Promise<ActivePlanResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/day/${dayId}/link-quiz`, {
    method: "POST",
    headers: jsonPostHeaders(token),
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as ActivePlanResponse;
}

export async function abandonPrepPlan(planId: string, token: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/${planId}`, {
    method: "DELETE",
    headers: headersWithAuth(token),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
}

export async function getPlanVapidPublicKey(token: string): Promise<{
  public_key: string | null;
  enabled: boolean;
}> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/vapid-public-key`, {
    headers: headersWithAuth(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
  return (await res.json()) as { public_key: string | null; enabled: boolean };
}

export async function subscribePlanPush(
  subscription: Record<string, unknown>,
  token: string,
): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/v1/plan/notifications/subscribe`, {
    method: "POST",
    headers: jsonPostHeaders(token),
    body: JSON.stringify({ subscription }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(body, `${res.status} ${res.statusText}`));
  }
}
