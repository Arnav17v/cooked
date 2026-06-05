"use client";

import { useAuth } from "@clerk/nextjs";
import { Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatRoastFailure } from "@/components/roast/roast-shared";
import { PaywallModal } from "@/components/billing/paywall-modal";
import {
  QuizEditorPane,
  QuizErrorPanel,
  QuizFieldTextarea,
  QuizLoadingPanel,
  QuizMetaGrid,
  QuizMetaRow,
  QuizPrimaryButton,
} from "@/components/interview/quiz-ui";
import { linkPrepPlanDayQuiz, linkPrepPlanModuleQuiz, PaymentRequiredError, startInterviewQuiz } from "@/lib/api";
import { showLlmDevTrace } from "@/lib/llm-dev-toast";
import { quizCountForLength } from "@/lib/quiz-length";
import {
  QUIZ_START_HANDOFF_KEY,
  type QuizStartHandoff,
} from "@/lib/interview-quiz-start-handoff";

import { QUIZ_SESSION_META_PREFIX } from "@/lib/quiz-session-meta";

const SEED_PREFIX = "cooked_interview_seed_v1_";

type Phase = "setup" | "starting" | "error";

function quizLengthLabel(count: number): string {
  if (count <= 3) return "Short · 3 questions";
  if (count <= 10) return "Medium · 10 questions";
  return "Long · 20 questions";
}

export function QuizStartClient() {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();

  const [phase, setPhase] = useState<Phase>("setup");
  const [handoff, setHandoff] = useState<QuizStartHandoff | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<PaymentRequiredError | null>(null);
  const [progressPct, setProgressPct] = useState(28);

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    const t = await getToken();
    return t ?? undefined;
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(QUIZ_START_HANDOFF_KEY);
    if (!raw?.trim()) {
      setPhase("error");
      setErrorMsg("No quiz start context — open this from your roast dashboard.");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as QuizStartHandoff;
      const resumeId = typeof parsed.resumeId === "string" ? parsed.resumeId.trim() : "";
      const role = typeof parsed.role === "string" ? parsed.role.trim() : "";
      if (!resumeId || !role) {
        setPhase("error");
        setErrorMsg("Missing resume or role — start again from the dashboard.");
        return;
      }
      setHandoff(parsed);
      const jd =
        typeof parsed.job_description === "string" ? parsed.job_description.trim() : "";
      if (jd) setJobDescription(jd);
    } catch {
      setPhase("error");
      setErrorMsg("Invalid quiz handoff — try again from the dashboard.");
    }
  }, []);

  const questionCount = useMemo(() => {
    if (!handoff) return 10;
    const rawCount = handoff.question_count;
    return typeof rawCount === "number" && rawCount > 0 ? rawCount : quizCountForLength("medium");
  }, [handoff]);

  const jdWordCount = useMemo(
    () => (jobDescription.trim() ? jobDescription.trim().split(/\s+/).filter(Boolean).length : 0),
    [jobDescription],
  );

  async function onStartInterview() {
    if (!handoff) return;

    const resumeId = handoff.resumeId.trim();
    const role = handoff.role.trim();
    const hardMode = Boolean(handoff.hard_mode);
    const jd = jobDescription.trim() || null;

    setPhase("starting");
    setErrorMsg(null);
    setProgressPct(28);

    try {
      const token = await bearer();
      const out = await startInterviewQuiz(
        resumeId,
        role,
        token ? { token } : undefined,
        hardMode,
        questionCount,
        jd,
      );
      showLlmDevTrace(out.dev_llm_trace);

      const planDayId =
        typeof handoff.plan_day_id === "string" ? handoff.plan_day_id.trim() : "";
      const planModuleId =
        typeof handoff.plan_module_id === "string" ? handoff.plan_module_id.trim() : "";
      if (token) {
        try {
          if (planModuleId) {
            await linkPrepPlanModuleQuiz(planModuleId, out.session_id, token);
          } else if (planDayId) {
            await linkPrepPlanDayQuiz(planDayId, out.session_id, token);
          }
        } catch {
          /* plan link is best-effort */
        }
      }

      setProgressPct(100);

      try {
        window.localStorage.removeItem(QUIZ_START_HANDOFF_KEY);
        window.localStorage.setItem(
          SEED_PREFIX + out.session_id,
          JSON.stringify({ questions: out.questions }),
        );
        const planId = typeof handoff.plan_id === "string" ? handoff.plan_id.trim() : "";
        const returnTo =
          typeof handoff.return_to === "string" && handoff.return_to.trim()
            ? handoff.return_to.trim()
            : planId
              ? `/plan?plan=${planId}`
              : undefined;
        const origin = handoff.origin;
        window.localStorage.setItem(
          QUIZ_SESSION_META_PREFIX + out.session_id,
          JSON.stringify({
            resumeId,
            role,
            jobTargeted: Boolean(out.job_targeted),
            ...(planModuleId ? { plan_module_id: planModuleId } : {}),
            ...(planId ? { plan_id: planId } : {}),
            ...(returnTo ? { return_to: returnTo } : {}),
            ...(origin ? { origin } : {}),
          }),
        );
      } catch {
        /* storage blocked */
      }

      router.replace(`/quiz/${out.session_id}`);
    } catch (e) {
      if (e instanceof PaymentRequiredError) {
        setPaywall(e);
        setPhase("setup");
        return;
      }
      const raw = e instanceof Error ? e.message : "Could not start the quiz.";
      setPhase("error");
      setErrorMsg(formatRoastFailure(raw));
    }
  }

  if (phase === "error") {
    return <QuizErrorPanel message={errorMsg ?? "Something went wrong."} />;
  }

  if (paywall) {
    return (
      <>
        <QuizErrorPanel message={paywall.message} />
        <PaywallModal open onClose={() => setPaywall(null)} error={paywall} />
      </>
    );
  }

  if (phase === "starting") {
    return (
      <QuizLoadingPanel
        title="Making your questions…"
        percent={progressPct}
        detail={
          jobDescription.trim()
            ? "Tailoring questions to your job description and resume. Do not close this tab."
            : "Reading your roast and generating interview prompts. Do not close this tab."
        }
      />
    );
  }

  if (!handoff) {
    return <QuizLoadingPanel title="Loading session…" />;
  }

  const hardMode = Boolean(handoff.hard_mode);
  const hasJd = jobDescription.trim().length > 0;

  return (
    <div className="space-y-6">
      <QuizEditorPane filename="session_config.json" icon={<Briefcase className="h-3.5 w-3.5 shrink-0 text-lv-rust" strokeWidth={2} />}>
        <QuizMetaGrid>
          <QuizMetaRow label="Target role" value={handoff.role} />
          <QuizMetaRow label="Quiz length" value={quizLengthLabel(questionCount)} />
          {hardMode ? <QuizMetaRow label="Mode" value="Hard" accent /> : null}
        </QuizMetaGrid>
      </QuizEditorPane>

      <QuizEditorPane
        filename={hasJd ? "job_description.txt" : "job_description.txt (optional)"}
        footer={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-[11px] leading-relaxed text-lv-cream/45">
              JD is stored for this quiz only — not saved to your roast. Leave blank for the standard quiz.
            </p>
            <QuizPrimaryButton onClick={() => void onStartInterview()} className="shrink-0 sm:min-w-[240px]">
              {hasJd ? "Start job-targeted interview" : "Start interview"}
            </QuizPrimaryButton>
          </div>
        }
      >
        <QuizFieldTextarea
          label="Job description"
          value={jobDescription}
          onChange={setJobDescription}
          rows={7}
          placeholder="Paste the posting — requirements, stack, responsibilities…"
          hint={
            jdWordCount > 0
              ? `${jdWordCount} words — questions will lean on this JD plus your resume.`
              : "Optional. Same roast can prep for Razorpay, Zepto, Groww — paste a different JD each time."
          }
        />
      </QuizEditorPane>
    </div>
  );
}
