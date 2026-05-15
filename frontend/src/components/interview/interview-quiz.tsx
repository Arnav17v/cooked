"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ScoreCard } from "@/components/score/ScoreCard";
import { QuestionDifficultyPill, normalizeHeatLabel } from "@/components/roast/roast-shared";
import {
  getNotes,
  kickoffNotesPostQuizUpdate,
  scoreInterviewQuiz,
  type InterviewFirstQuestion,
  type InterviewPerAnswerFeedback,
  type InterviewScoreResponse,
  type NotesGetResponse,
} from "@/lib/api";
import { QUIZ_START_HANDOFF_KEY, type QuizStartHandoff } from "@/lib/interview-quiz-start-handoff";

const SEED_PREFIX = "cooked_interview_seed_v1_";
const META_PREFIX = "cooked_interview_meta_v1_";
const ANSWERS_PREFIX = "cooked_quiz_answers_v1_";
const NOTES_QUIZ_HIGHLIGHT_LS = "cooked_notes_quiz_highlight_v1";

type InterviewMeta = { resumeId: string; role: string };

function feedbackLabel(signal: InterviewPerAnswerFeedback["signal"]) {
  if (signal === "green") return "Strong answer";
  if (signal === "red") return "Needs work";
  return "Mixed";
}

function feedbackAccent(signal: InterviewPerAnswerFeedback["signal"]) {
  if (signal === "green") {
    return {
      card: "border-l-[3px] border-l-lc-easy bg-lc-easy/[0.08]",
      badge: "bg-lc-easy/20 text-lc-easy ring-1 ring-lc-easy/40",
      quoteBar: "border-l-lc-easy bg-lc-easy/[0.12]",
      quoteGlow: "text-lc-text",
    };
  }
  if (signal === "red") {
    return {
      card: "border-l-[3px] border-l-lc-hard bg-lc-hard/[0.08]",
      badge: "bg-lc-hard/20 text-lc-hard ring-1 ring-lc-hard/40",
      quoteBar: "border-l-lc-hard bg-lc-hard/[0.12]",
      quoteGlow: "text-lc-text",
    };
  }
  return {
    card: "border-l-[3px] border-l-lc-medium bg-lc-medium/[0.07]",
    badge: "bg-lc-medium/20 text-lc-medium ring-1 ring-lc-medium/40",
    quoteBar: "border-l-lc-medium bg-lc-medium/[0.12]",
    quoteGlow: "text-lc-text",
  };
}

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

  const onHardAgain = () => {
    if (typeof window === "undefined") return;
    const mkey = META_PREFIX + sessionId;
    const raw = localStorage.getItem(mkey) ?? sessionStorage.getItem(mkey);
    if (!raw) {
      setSubmitError("Missing resume context — start from the dashboard.");
      return;
    }
    let meta: InterviewMeta;
    try {
      meta = JSON.parse(raw) as InterviewMeta;
    } catch {
      setSubmitError("Missing resume context — start from the dashboard.");
      return;
    }
    setSubmitError(null);
    const handoff: QuizStartHandoff = {
      resumeId: meta.resumeId,
      role: meta.role,
      hard_mode: true,
    };
    try {
      localStorage.setItem(QUIZ_START_HANDOFF_KEY, JSON.stringify(handoff));
    } catch {
      setSubmitError("Could not start hard mode — storage blocked.");
      return;
    }
    router.push("/quiz/start");
  };

  if (initError) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-[14px] text-lc-muted">{initError}</p>
        <Link href="/dashboard" className="mt-6 inline-block text-lc-orange hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (result) {
    const cooked = normalizeHeatLabel(result.heat_label).toLowerCase() === "cooked";
    const headline =
      result.one_liner?.trim() ||
      (cooked ? "You're cooked." : "Not cooked — keep shipping.");

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
      <div className="mx-auto max-w-3xl px-5 py-12">
        <ScoreCard
          cookedScore={Math.round(result.final_score)}
          heatLabel={normalizeHeatLabel(result.heat_label)}
          headline={headline}
          showTargetRole={false}
          showFooter={false}
        />

        <section className="mt-12">
          <h2 className="font-mono text-[12px] font-semibold uppercase tracking-wide text-lc-dim">
            Answer breakdown
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-lc-muted">
            Quote colors match how each answer landed: green (strong), yellow (mixed), red (thin or risky).
          </p>
          <div className="mt-8 space-y-8">
            {reportRows.map((row, idx) => {
              const sig = normalizeReportSignal(row.signal);
              const accents = feedbackAccent(sig);
              const q = questions[idx];
              const fullAnswer = trimmedAnswers[idx] ?? "";
              const quote = row.highlight_quote?.trim() || fullAnswer.slice(0, 220);
              return (
                <article
                  key={`q-${idx + 1}`}
                  className={`rounded-xl border border-lc-border px-5 py-5 sm:px-6 sm:py-6 ${accents.card}`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-lc-dim">
                      Question {idx + 1}
                    </span>
                    {q?.difficulty ? (
                      <span className="inline-flex">
                        <QuestionDifficultyPill level={q.difficulty} />
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${accents.badge}`}
                    >
                      {feedbackLabel(sig)}
                    </span>
                  </div>
                  {q?.question ? (
                    <p className="mt-4 text-[15px] leading-relaxed text-lc-text">
                      &ldquo;{q.question}&rdquo;
                    </p>
                  ) : null}
                  <div
                    className={`relative mt-4 rounded-lg border border-lc-border py-3 pl-4 pr-3 ${accents.quoteBar}`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wide text-lc-muted">
                      Key quote
                    </span>
                    <p className={`mt-1 text-[13px] font-semibold italic leading-snug ${accents.quoteGlow}`}>
                      {quote.trim() ? `“${quote.trim()}”` : "No short quote — refer to your full answer below."}
                    </p>
                  </div>
                  {fullAnswer.trim() ? (
                    <div className="mt-4">
                      <p className="font-mono text-[10px] uppercase tracking-wide text-lc-muted">
                        Your full answer
                      </p>
                      <pre className="mt-2 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-lg border border-lc-border bg-lc-bg px-3 py-2.5 font-mono text-[12px] leading-relaxed text-lc-muted">
                        {fullAnswer}
                      </pre>
                    </div>
                  ) : null}
                  <div className="mt-5 border-t border-lc-divider pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-wide text-lc-muted">AI critique</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-lc-muted">{row.analysis}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {submitError ? <p className="mt-4 text-[12px] text-lc-hard">{submitError}</p> : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/roast?new=1"
            className="inline-flex h-10 items-center rounded-lg border border-lc-border bg-lc-elevated px-5 text-[13px] font-medium text-lc-text hover:border-lc-orange/50"
          >
            roast a different resume
          </Link>
          <button
            type="button"
            onClick={() => onHardAgain()}
            className="inline-flex h-10 items-center rounded-lg bg-lc-orange px-5 text-[13px] font-semibold text-black hover:bg-lc-orangeHover"
          >
            try again · hard mode
          </button>
        </div>
      </div>
    );
  }

  if (scoring) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <div
          className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-lc-border border-t-lc-orange"
          aria-hidden
        />
        <p className="mt-8 font-mono text-[14px] font-medium text-lc-text">Scoring…</p>
        <p className="mt-3 text-[13px] text-lc-muted">Sending your answers to the model for a final grade.</p>
      </div>
    );
  }

  if (!ready || !current) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <div
          className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-lc-border border-t-lc-orange"
          aria-hidden
        />
        <p className="mt-6 font-mono text-[13px] text-lc-muted">Preparing your quiz…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-lc-dim">
          Question {qIndex + 1} of {nq}
        </p>
        <span className="inline-flex">
          <QuestionDifficultyPill level={current.difficulty} />
        </span>
      </div>

      <div className="rounded-xl border border-lc-border bg-lc-surface p-5 sm:p-6">
        <p className="text-[15px] leading-relaxed text-lc-text">&ldquo;{current.question}&rdquo;</p>

        <label className="mt-6 block">
          <span className="sr-only">Your answer</span>
          <textarea
            value={slotAnswers[qIndex] ?? ""}
            onChange={(e) => updateLine(e.target.value)}
            rows={8}
            className="mt-2 w-full resize-y rounded-lg border border-lc-border bg-lc-bg px-3 py-2.5 font-mono text-[13px] text-lc-text placeholder:text-lc-dim focus:border-lc-orange/60 focus:outline-none"
            placeholder="Type your answer…"
          />
        </label>

        {submitError ? (
          <p
            className="mt-3 rounded-lg border border-lc-hard/40 bg-lc-hard/10 px-3 py-2.5 text-[13px] leading-relaxed text-lc-hard"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!atLast ? (
            <button
              type="button"
              disabled={!canNextBtn}
              onClick={onNext}
              className="inline-flex h-10 items-center rounded-lg border border-lc-orange/60 bg-lc-orange/10 px-5 text-[13px] font-semibold text-lc-orange hover:bg-lc-orange/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next question
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void onSubmitQuiz()}
              className="inline-flex h-10 items-center rounded-lg bg-lc-orange px-5 text-[13px] font-semibold text-black hover:bg-lc-orangeHover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit quiz
            </button>
          )}
          <p className="max-w-[20rem] text-[12px] text-lc-dim">
            Answers save locally as you go. Nothing is sent until you submit — then one scoring run.
          </p>
        </div>
      </div>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-lc-border">
        <div
          className="h-full rounded-full bg-lc-orange transition-[width] duration-300"
          style={{ width: `${((qIndex + 1) / Math.max(nq, 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
