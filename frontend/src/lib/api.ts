/** Typed FastAPI client. Never import an LLM SDK here — only backend HTTP. */

import { getOrCreateAnonymousClientId } from "./anonymous-client";

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
};

export type ScoreResponse = {
  cooked_score: number | null;
  score?: number | null;
  heat_label?: string | null;
  headline?: string | null;
  one_liner?: string | null;
  role?: string | null;
  score_breakdown: Record<string, unknown>;
  share_slug: string;
  degraded: boolean;
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

export type SharePayload = {
  share_slug: string;
  target_role: string;
  role?: string;
  cooked_score: number | null;
  score?: number | null;
  heat_label?: string | null;
  headline?: string | null;
  one_liner?: string | null;
  degraded: boolean;
};

/** SSE events from `/api/v1/resume/.../events` — `step`-first wire format */
export type AnalysisEventPayload =
  | {
      step: "extracting" | "scoring" | "flagging" | "questions";
    }
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
};

export type InterviewStartResponse = {
  session_id: string;
  questions: InterviewFirstQuestion[];
};

export type InterviewPerAnswerFeedback = {
  n: number;
  signal: "green" | "yellow" | "red";
  highlight_quote: string;
  analysis: string;
};

export type InterviewScoreResponse = {
  final_score: number;
  heat_label: string;
  one_liner: string | null;
  per_answer?: InterviewPerAnswerFeedback[];
  interview_quiz_scores?: QuizScoreHistoryEntry[];
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
): Promise<InterviewStartResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/interview/start`, {
    method: "POST",
    headers: jsonPostHeaders(auth?.token),
    body: JSON.stringify({
      resume_id: resumeId,
      role,
      hard_mode: hardMode,
      question_count: questionCount,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as InterviewStartResponse;
}

export async function scoreInterviewQuiz(
  sessionId: string,
  answers: string[],
  auth?: ApiAuth,
): Promise<InterviewScoreResponse> {
  const res = await fetch(`${getApiBase()}/api/v1/interview/score`, {
    method: "POST",
    headers: jsonPostHeaders(auth?.token),
    body: JSON.stringify({ session_id: sessionId, answers }),
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
): Promise<Record<string, unknown>> {
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
  return (await res.json()) as Record<string, unknown>;
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
