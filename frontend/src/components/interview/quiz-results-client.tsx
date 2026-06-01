"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { QuizAnalysisResults } from "@/components/interview/quiz-analysis-results";
import { QuizErrorPanel, QuizLoadingPanel } from "@/components/interview/quiz-ui";
import {
  fetchQuizResults,
  type InterviewFirstQuestion,
  type InterviewPerAnswerFeedback,
} from "@/lib/api";
import { readQuizSessionMeta } from "@/lib/quiz-session-meta";

function normalizeReportSignal(raw: string | undefined): InterviewPerAnswerFeedback["signal"] {
  const s = (raw ?? "").toLowerCase();
  if (s === "green") return "green";
  if (s === "red") return "red";
  return "yellow";
}

type Props = {
  sessionId: string;
};

export function QuizResultsClient({ sessionId }: Props) {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof fetchQuizResults>> | null>(null);

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    const t = await getToken();
    return t ?? undefined;
  }, [getToken, isSignedIn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await bearer();
        const out = await fetchQuizResults(sessionId, token ? { token } : undefined);
        if (!cancelled) setPayload(out);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load quiz results");
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, bearer]);

  if (loading) {
    return <QuizLoadingPanel title="Loading analysis…" />;
  }

  if (error || !payload) {
    return <QuizErrorPanel message={error ?? "Results not found."} />;
  }

  const questions = (Array.isArray(payload.questions) ? payload.questions : []) as InterviewFirstQuestion[];
  const answers = Array.isArray(payload.answers)
    ? payload.answers.map((a) => (typeof a === "string" ? a : ""))
    : [];
  const pa = Array.isArray(payload.per_answer) ? payload.per_answer : [];
  const nReport = Math.max(questions.length, answers.length, pa.length, 1);

  const reportRows: InterviewPerAnswerFeedback[] = Array.from({ length: nReport }, (_, idx) => {
    const row = pa[idx];
    if (row && typeof row === "object") {
      return {
        n: typeof row.n === "number" ? row.n : idx + 1,
        signal: normalizeReportSignal(String(row.signal)),
        highlight_quote: typeof row.highlight_quote === "string" ? row.highlight_quote : "",
        analysis: typeof row.analysis === "string" ? row.analysis : "",
      };
    }
    return {
      n: idx + 1,
      signal: "yellow" as const,
      highlight_quote: (answers[idx] ?? "").trim().slice(0, 220),
      analysis: "No per-answer feedback stored for this quiz.",
    };
  });

  const headline =
    payload.one_liner?.trim() ||
    "Technically solid in places, but gaps show when you go deeper on fundamentals.";

  const meta = readQuizSessionMeta(sessionId);
  const planReturn =
    meta?.origin === "plan" && meta.return_to?.trim() ? meta.return_to.trim() : null;

  return (
    <QuizAnalysisResults
      sessionId={payload.session_id}
      finalScore={payload.final_score}
      headline={headline}
      reportRows={reportRows}
      questions={questions}
      answers={answers}
      onBackToDashboard={() => router.push("/dashboard")}
      onBackToPlan={planReturn ? () => router.push(planReturn) : undefined}
      backToPlanLabel="Back to plan"
    />
  );
}
