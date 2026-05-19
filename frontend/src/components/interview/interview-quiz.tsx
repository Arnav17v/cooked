"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  QuizEditorPane,
  QuizErrorPanel,
  QuizLoadingPanel,
  QuizPrimaryButton,
  QuizProgressBar,
  QuizStepRail,
} from "@/components/interview/quiz-ui";
import { QuizAnalysisResults } from "@/components/interview/quiz-analysis-results";
import { QuestionDifficultyPill } from "@/components/roast/roast-shared";
import {
  getNotes,
  kickoffNotesPostQuizUpdate,
  scoreInterviewQuiz,
  type InterviewFirstQuestion,
  type InterviewPerAnswerFeedback,
  type InterviewScoreResponse,
  type NotesGetResponse,
} from "@/lib/api";

const SEED_PREFIX = "cooked_interview_seed_v1_";
const META_PREFIX = "cooked_interview_meta_v1_";
const ANSWERS_PREFIX = "cooked_quiz_answers_v1_";
const NOTES_QUIZ_HIGHLIGHT_LS = "cooked_notes_quiz_highlight_v1";

function normalizeReportSignal(raw: string | undefined): InterviewPerAnswerFeedback["signal"] {
  const s = (raw ?? "").toLowerCase();
  if (s === "green") return "green";
  if (s === "red") return "red";
  return "yellow";
}

function buildFallbackReport(
  qs: InterviewFirstQuestion[],
  ans: string[],
  count: number,
): InterviewPerAnswerFeedback[] {
  return Array.from({ length: count }, (_, i) => {
    const trimmed = ans[i]?.trim() ?? "";
    const cut = trimmed.length > 220 ? trimmed.slice(0, 219).trimEnd() + "…" : trimmed;
    return {
      n: i + 1,
      signal: "yellow" as const,
      highlight_quote: cut,
      analysis:
        "No per-answer feedback was returned. Add metrics, constraints, tradeoffs, and proof tied to what's on your resume.",
    };
  });
}

type QuizSeed = { questions: InterviewFirstQuestion[] };

/** Survives React Strict Mode (dev). */
const seedHandoffBySessionId = new Map<string, QuizSeed>();

function emptyAnswers(length: number): string[] {
  return Array.from({ length }, () => "");
}

function answersStorageKey(sessionId: string): string {
  return ANSWERS_PREFIX + sessionId;
}

export function InterviewQuiz({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();

  const [initError, setInitError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [questions, setQuestions] = useState<InterviewFirstQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<InterviewScoreResponse | null>(null);
  const [metaResumeId, setMetaResumeId] = useState<string | null>(null);

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    const t = await getToken();
    return t ?? undefined;
  }, [getToken, isSignedIn]);

  /** Hydrate questions from handoff + optional saved answers draft. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const skey = SEED_PREFIX + sessionId;

    let seed = seedHandoffBySessionId.get(sessionId);
    if (!seed) {
      const raw = localStorage.getItem(skey) ?? sessionStorage.getItem(skey);
      if (!raw) {
        setInitError("Start the quiz from your roast dashboard (quiz me on this).");
        return;
      }
      try {
        const parsed = JSON.parse(raw) as QuizSeed;
        const nqq = parsed.questions?.length ?? 0;
        if (!Array.isArray(parsed.questions) || nqq < 1 || nqq > 25) {
          setInitError("Invalid quiz handoff — start again from the dashboard.");
          return;
        }
        seed = parsed;
        seedHandoffBySessionId.set(sessionId, seed);
        localStorage.removeItem(skey);
        sessionStorage.removeItem(skey);
      } catch {
        setInitError("Could not load this quiz session.");
        return;
      }
    }

    const nQuiz = seed.questions.length;

    let initialAnswers = emptyAnswers(nQuiz);
    const draftRaw = localStorage.getItem(answersStorageKey(sessionId));
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as string[];
        if (Array.isArray(draft) && draft.length === nQuiz) {
          initialAnswers = draft.map((a) => (typeof a === "string" ? a : ""));
        }
      } catch {
        /* ignore */
      }
    }

    setQuestions(seed.questions);
    setAnswers(initialAnswers);
    setReady(true);

    try {
      const mraw =
        localStorage.getItem(META_PREFIX + sessionId) ?? sessionStorage.getItem(META_PREFIX + sessionId);
      if (mraw) {
        const m = JSON.parse(mraw) as { resumeId?: string };
        if (typeof m.resumeId === "string" && m.resumeId.trim()) setMetaResumeId(m.resumeId.trim());
      }
    } catch {
      /* */
    }
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined" || !ready || !metaResumeId || questions.length === 0) return;
    const cur = questions[qIndex];
    const sid = cur?.source_note_section_id;
    const tag = cur?.source_note_section_tag;
    try {
      localStorage.setItem(
        NOTES_QUIZ_HIGHLIGHT_LS,
        JSON.stringify({
          resumeId: metaResumeId,
          sectionId: sid && sid.trim() ? sid : null,
          sectionTag: tag && String(tag).trim() ? String(tag).trim() : null,
        }),
      );
    } catch {
      /* */
    }
  }, [ready, qIndex, questions, metaResumeId]);

  /** Autosave answers to localStorage (instant; no network). */
  useEffect(() => {
    const nQuiz = questions.length;
    if (typeof window === "undefined" || !ready || nQuiz === 0) return;
    try {
      const payload = answers.slice(0, nQuiz);
      while (payload.length < nQuiz) payload.push("");
      localStorage.setItem(answersStorageKey(sessionId), JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
  }, [answers, ready, sessionId, questions.length]);

  const nq = questions.length;
  const current = questions[qIndex];
  const atLast = nq > 0 && qIndex === nq - 1;
  const slotAnswers = Array.from({ length: nq }, (_, i) => answers[i] ?? "");
  const allFilled = nq > 0 && slotAnswers.every((a) => a.trim().length > 0);
  const canNextBtn = nq > 0 && !atLast && slotAnswers[qIndex]?.trim().length > 0 && !scoring;
  const canSubmit = nq > 0 && atLast && allFilled && !scoring;

  const updateLine = (value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      while (next.length <= qIndex) next.push("");
      next[qIndex] = value;
      return next;
    });
  };

  const onNext = () => {
    if (!atLast && canNextBtn) {
      setQIndex((i) => i + 1);
      setSubmitError(null);
    }
  };

  const onSubmitQuiz = async () => {
    if (scoring || nq < 1) return;
    const trimmed = slotAnswers.map((a) => a.trim());
    if (trimmed.length !== nq || trimmed.some((a) => !a)) {
      setSubmitError("Answer every question before submitting.");
      return;
    }
    setScoring(true);
    setSubmitError(null);
    try {
      const token = await bearer();
      const auth = token ? { token } : undefined;

      let postQuizBaseline: string | null = null;
      let postQuizResumeId: string | null = null;
      let hadNotes = false;
      let preQuizNotes: NotesGetResponse | null = null;
      try {
        const mraw =
          localStorage.getItem(META_PREFIX + sessionId) ?? sessionStorage.getItem(META_PREFIX + sessionId);
        if (mraw) {
          const meta = JSON.parse(mraw) as { resumeId?: string };
          const rid = typeof meta.resumeId === "string" ? meta.resumeId.trim() : "";
          if (rid) {
            postQuizResumeId = rid;
            try {
              const notesPayload = await getNotes(rid, auth);
              if (notesPayload) {
                hadNotes = true;
                preQuizNotes = notesPayload;
                postQuizBaseline = notesPayload.updated_at ?? null;
              }
            } catch {
              /* no notes */
            }
          }
        }
      } catch {
        /* */
      }

      const out = await scoreInterviewQuiz(sessionId, trimmed, auth);
      setResult(out);

      if (postQuizResumeId && hadNotes) {
        kickoffNotesPostQuizUpdate(postQuizResumeId, sessionId, auth);
        try {
          const weakIdsBefore =
            preQuizNotes?.sections
              ?.filter((s) => s.weak_indicator)
              .map((s) => s.section_id)
              .filter((id): id is string => typeof id === "string" && id.length > 0) ?? [];
          sessionStorage.setItem(
            `notes_post_quiz_${postQuizResumeId}`,
            JSON.stringify({
              baseline: postQuizBaseline,
              t: Date.now(),
              weak_ids_before: weakIdsBefore,
            }),
          );
        } catch {
          /* */
        }
      }
      try {
        localStorage.removeItem(answersStorageKey(sessionId));
      } catch {
        /* ignore */
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setScoring(false);
    }
  };

  if (initError) {
    return <QuizErrorPanel message={initError} />;
  }

  if (result) {
    const headline =
      result.one_liner?.trim() ||
      "Technically solid in places, but gaps show when you go deeper on fundamentals.";

    const pa = Array.isArray(result.per_answer) ? result.per_answer : [];
    const nReport = Math.max(nq, pa.length, 1);
    const rawRows = pa.length === nReport ? pa : null;

    const trimmedAnswers = Array.from({ length: nReport }, (_, i) => (answers[i] ?? "").trim());

    const reportRows: InterviewPerAnswerFeedback[] =
      rawRows?.map((row, idx) => ({
        n: typeof row?.n === "number" ? row.n : idx + 1,
        signal: normalizeReportSignal(String(row?.signal)),
        highlight_quote: typeof row?.highlight_quote === "string" ? row.highlight_quote : "",
        analysis: typeof row?.analysis === "string" ? row.analysis : "",
      })) ?? buildFallbackReport(questions, trimmedAnswers, nReport);

    return (
      <QuizAnalysisResults
        sessionId={sessionId}
        finalScore={result.final_score}
        headline={headline}
        reportRows={reportRows}
        questions={questions}
        answers={trimmedAnswers}
        submitError={submitError}
        onBackToDashboard={() => router.push("/dashboard")}
      />
    );
  }

  if (scoring) {
    return (
      <QuizLoadingPanel
        title="Scoring…"
        detail="Sending your answers to the model for a final grade."
      />
    );
  }

  if (!ready || !current) {
    return <QuizLoadingPanel title="Preparing your quiz…" />;
  }

  let answeredThrough = -1;
  for (let i = 0; i < nq; i++) {
    if (slotAnswers[i]?.trim()) answeredThrough = i;
  }

  const qFile = `q_${String(qIndex + 1).padStart(2, "0")}.md`;

  return (
    <div>
      <QuizStepRail total={nq} currentIndex={qIndex} answeredThrough={answeredThrough} />

      <QuizEditorPane
        filename={qFile}
        footer={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xs text-[11px] leading-relaxed text-lv-cream/45">
              Saves locally until submit. One scoring run at the end.
            </p>
            <div className="flex flex-wrap gap-2">
              {!atLast ? (
                <QuizPrimaryButton disabled={!canNextBtn} onClick={onNext} className="min-w-[180px]">
                  Next question
                </QuizPrimaryButton>
              ) : (
                <QuizPrimaryButton
                  disabled={!canSubmit}
                  onClick={() => void onSubmitQuiz()}
                  className="min-w-[180px]"
                >
                  Submit quiz
                </QuizPrimaryButton>
              )}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-jetbrains text-[10px] uppercase tracking-widest text-lv-cream-dim">
            {qIndex + 1} / {nq}
          </span>
          <QuestionDifficultyPill level={current.difficulty} />
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-lv-cream">&ldquo;{current.question}&rdquo;</p>

        {current.why ? (
          <p className="mt-4 border-l-2 border-lv-rust/60 py-0.5 pl-3 text-[12px] leading-relaxed text-lv-cream-dim">
            <span className="font-jetbrains text-[10px] uppercase tracking-wide text-lv-rust">Why · </span>
            {current.why}
          </p>
        ) : null}

        <label className="mt-6 block">
          <span className="mb-2 block font-jetbrains text-[11px] uppercase tracking-widest text-lv-cream-dim">
            your_answer.txt
          </span>
          <textarea
            value={slotAnswers[qIndex] ?? ""}
            onChange={(e) => updateLine(e.target.value)}
            rows={8}
            className="w-full resize-y border border-lv-rule bg-lv-black/40 px-3.5 py-2.5 font-jetbrains text-[13px] leading-relaxed text-lv-cream outline-none placeholder:text-lv-cream/30 focus:border-lv-rust/70"
            placeholder="Type your answer…"
          />
        </label>

        {submitError ? (
          <p
            className="mt-4 border border-[#ef4743]/40 bg-[#ef4743]/10 px-3 py-2.5 text-[13px] text-[#ef4743]"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}
      </QuizEditorPane>

      <QuizProgressBar value={((qIndex + 1) / Math.max(nq, 1)) * 100} />
    </div>
  );
}
