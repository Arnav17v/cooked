"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { startInterviewQuiz } from "@/lib/api";
import {
  QUIZ_START_HANDOFF_KEY,
  type QuizStartHandoff,
} from "@/lib/interview-quiz-start-handoff";

const META_PREFIX = "cooked_interview_meta_v1_";
const SEED_PREFIX = "cooked_interview_seed_v1_";

export function QuizStartClient() {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const [phase, setPhase] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    const t = await getToken();
    return t ?? undefined;
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    (async () => {
      const raw = window.localStorage.getItem(QUIZ_START_HANDOFF_KEY);
      if (!raw?.trim()) {
        if (!cancelled) {
          setPhase("error");
          setErrorMsg("No quiz start context — open this from your roast dashboard.");
        }
        return;
      }

      let handoff: QuizStartHandoff;
      try {
        handoff = JSON.parse(raw) as QuizStartHandoff;
      } catch {
        if (!cancelled) {
          setPhase("error");
          setErrorMsg("Invalid quiz handoff — try again from the dashboard.");
        }
        return;
      }

      const resumeId = typeof handoff.resumeId === "string" ? handoff.resumeId.trim() : "";
      const role = typeof handoff.role === "string" ? handoff.role.trim() : "";
      const hardMode = Boolean(handoff.hard_mode);

      if (!resumeId || !role) {
        if (!cancelled) {
          setPhase("error");
          setErrorMsg("Missing resume or role — start again from the dashboard.");
        }
        return;
      }

      try {
        const token = await bearer();
        const out = await startInterviewQuiz(
          resumeId,
          role,
          token ? { token } : undefined,
          hardMode,
        );
        if (cancelled) return;

        try {
          window.localStorage.removeItem(QUIZ_START_HANDOFF_KEY);
          window.localStorage.setItem(
            SEED_PREFIX + out.session_id,
            JSON.stringify({ questions: out.questions }),
          );
          window.localStorage.setItem(
            META_PREFIX + out.session_id,
            JSON.stringify({ resumeId, role }),
          );
        } catch {
          /* storage blocked */
        }

        router.replace(`/quiz/${out.session_id}`);
      } catch (e) {
        if (!cancelled) {
          setPhase("error");
          setErrorMsg(e instanceof Error ? e.message : "Could not start the quiz.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bearer, router]);

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="text-[14px] text-lc-muted">{errorMsg}</p>
        <Link href="/dashboard" className="mt-8 inline-block text-lc-orange hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <div
        className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-lc-border border-t-lc-orange"
        aria-hidden
      />
      <p className="mt-10 font-mono text-[15px] font-medium text-lc-text">Making your questions…</p>
      <p className="mt-4 text-[14px] leading-relaxed text-lc-muted">
        We&apos;re reading your roast and asking the model to generate interview prompts grounded in what you
        actually wrote. This usually takes a few seconds.
      </p>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-lc-dim">Do not close this tab</p>
    </div>
  );
}
