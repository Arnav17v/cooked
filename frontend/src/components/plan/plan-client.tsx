"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { DashboardSkeleton } from "@/components/roast/dashboard-skeleton";
import { formatRoastFailure, LAST_RESUME_LS } from "@/components/roast/roast-shared";
import { PlanExecution } from "@/components/plan/plan-execution";
import { PlanForm } from "@/components/plan/plan-form";
import { PlanList } from "@/components/plan/plan-list";
import { PlanModifyBar } from "@/components/plan/plan-modify-bar";
import { PlanOverview } from "@/components/plan/plan-overview";
import { PlanToolbarMenu } from "@/components/plan/plan-toolbar-menu";
import {
  abandonPrepPlan,
  completePrepPlanModule,
  fetchMyRoasts,
  generatePrepPlan,
  generatePrepPlanDayModules,
  getPlanVapidPublicKey,
  getPrepPlan,
  initiatePrepPlan,
  listPrepPlans,
  modifyPrepPlan,
  subscribePlanPush,
  type ActivePlanResponse,
  type PrepPlanSummaryDto,
} from "@/lib/api";

type Phase = "loading" | "list" | "form" | "generating" | "plan" | "error";

const PLAN_SW_URL = "/plan-sw.js";

export function PlanClient() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planQuery = searchParams.get("plan");
  const newQuery = searchParams.get("new");
  const resumeQuery = searchParams.get("resume");

  const [phase, setPhase] = useState<Phase>("loading");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [plans, setPlans] = useState<PrepPlanSummaryDto[]>([]);
  const [planData, setPlanData] = useState<ActivePlanResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [jdText, setJdText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [generatingDayId, setGeneratingDayId] = useState<string | null>(null);
  const [modifying, setModifying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingModuleId, setCompletingModuleId] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const skipPlanQueryRefetch = useRef(true);

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    return (await getToken()) ?? undefined;
  }, [getToken, isSignedIn]);

  const loadList = useCallback(async () => {
    const token = await bearer();
    if (!token) {
      setPhase("list");
      return;
    }
    const out = await listPrepPlans(token);
    setPlans(out.plans);
    setPhase("list");
  }, [bearer]);

  const loadPlan = useCallback(
    async (planId: string) => {
      const token = await bearer();
      if (!token) return;
      const out = await getPrepPlan(planId, token);
      setPlanData(out);
      setPhase("plan");
    },
    [bearer],
  );

  const resolveView = useCallback(async () => {
    setErrorMsg(null);
    const token = await bearer();
    if (!token) return;

    if (planQuery) {
      await loadPlan(planQuery);
      return;
    }
    if (newQuery === "1") {
      setPlanData(null);
      setPhase("form");
      return;
    }
    await loadList();
  }, [bearer, planQuery, newQuery, loadPlan, loadList]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in?redirect_url=/plan");
      return;
    }

    let cancelled = false;

    (async () => {
      const q = resumeQuery?.trim();
      if (q) {
        if (!cancelled) setResumeId(q);
      } else {
        const token = await bearer();
        if (token) {
          try {
            const items = await fetchMyRoasts(token);
            const done = items.find((i) => i.analysis_status === "done");
            if (done && !cancelled) {
              setResumeId(done.resume_id);
              if (done.target_role) setRole(done.target_role);
            } else if (!cancelled) {
              const stored = window.localStorage.getItem(LAST_RESUME_LS);
              if (stored) setResumeId(stored);
            }
          } catch {
            const stored = window.localStorage.getItem(LAST_RESUME_LS);
            if (stored && !cancelled) setResumeId(stored);
          }
        }
      }
      if (!cancelled) {
        try {
          await resolveView();
        } catch (e) {
          setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Could not load plans."));
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, resumeQuery, bearer, resolveView, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (skipPlanQueryRefetch.current) {
      skipPlanQueryRefetch.current = false;
      return;
    }
    void resolveView().catch((e) => {
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Could not load plans."));
      setPhase("error");
    });
  }, [planQuery, newQuery, isLoaded, isSignedIn, resolveView]);

  function goToList() {
    setPlanData(null);
    router.push("/plan");
  }

  function goToNewPlan() {
    setPlanData(null);
    setPhase("form");
    router.push("/plan?new=1");
  }

  function openPlan(planId: string) {
    router.push(`/plan?plan=${planId}`);
    void loadPlan(planId).catch((e) => {
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Could not load plan."));
      setPhase("error");
    });
  }

  async function onGenerate() {
    if (!resumeId) {
      setErrorMsg("Upload and roast a resume first, then come back to plan.");
      setPhase("error");
      return;
    }
    const token = await bearer();
    if (!token) return;

    setGenerating(true);
    setErrorMsg(null);
    try {
      const out = await generatePrepPlan(
        {
          resume_id: resumeId,
          company_name: companyName.trim(),
          role: role.trim(),
          interview_date: interviewDate,
          jd_text: jdText.trim(),
        },
        token,
      );
      setPlanData(out);
      router.push(`/plan?plan=${out.plan.id}`);
      setPhase("plan");
    } catch (e) {
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Generation failed."));
      setPhase("error");
    } finally {
      setGenerating(false);
    }
  }

  async function onModify(instruction: string) {
    if (!planData) return;
    const token = await bearer();
    if (!token) return;
    setModifying(true);
    try {
      const out = await modifyPrepPlan(planData.plan.id, instruction, token);
      setPlanData(out);
    } catch (e) {
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Update failed."));
    } finally {
      setModifying(false);
    }
  }

  async function onInitiate() {
    if (!planData) return;
    const token = await bearer();
    if (!token) return;
    setInitiating(true);
    setErrorMsg(null);
    try {
      const out = await initiatePrepPlan(planData.plan.id, token);
      setPlanData(out);
    } catch (e) {
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Initiation failed."));
      setPhase("error");
    } finally {
      setInitiating(false);
    }
  }

  async function onGenerateDay(dayId: string) {
    if (!planData) return;
    const token = await bearer();
    if (!token) return;
    if (generatingDayId === dayId) return;
    setGeneratingDayId(dayId);
    setErrorMsg(null);
    try {
      const out = await generatePrepPlanDayModules(dayId, token);
      setPlanData(out);
    } catch (e) {
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Day generation failed."));
      try {
        const refreshed = await getPrepPlan(planData.plan.id, token);
        setPlanData(refreshed);
      } catch {
        /* ignore refresh failure */
      }
    } finally {
      setGeneratingDayId(null);
    }
  }

  async function onCompleteModule(moduleId: string) {
    const token = await bearer();
    if (!token) return;
    setCompletingModuleId(moduleId);
    try {
      const out = await completePrepPlanModule(moduleId, token);
      setPlanData(out);
    } catch (e) {
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Could not update module."));
    } finally {
      setCompletingModuleId(null);
    }
  }

  async function onDelete(planId: string) {
    const token = await bearer();
    if (!token) return;
    const target =
      planData?.plan.id === planId
        ? planData.plan
        : plans.find((p) => p.id === planId);
    const label = target
      ? `${target.company_name} — ${target.role}`
      : "this plan";
    const confirmed = window.confirm(
      `Delete "${label}"?\n\nAll days, modules, and quiz progress for this plan will be permanently removed. This cannot be undone.`,
    );
    if (!confirmed) return;
    setDeletingId(planId);
    try {
      await abandonPrepPlan(planId, token);
      if (planData?.plan.id === planId) {
        setPlanData(null);
        await loadList();
        router.push("/plan");
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
      }
    } catch (e) {
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Could not delete plan."));
    } finally {
      setDeletingId(null);
    }
  }

  async function onTogglePush() {
    const token = await bearer();
    if (!token) return;
    if (pushEnabled) {
      setPushEnabled(false);
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setErrorMsg("Push notifications are not supported in this browser.");
      return;
    }
    setPushBusy(true);
    try {
      const { public_key, enabled } = await getPlanVapidPublicKey(token);
      if (!enabled || !public_key) {
        setErrorMsg("Daily reminders are not configured on the server yet.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setErrorMsg("Notification permission denied.");
        return;
      }
      const reg = await navigator.serviceWorker.register(PLAN_SW_URL, { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key) as BufferSource,
      });
      await subscribePlanPush(sub.toJSON() as Record<string, unknown>, token);
      setPushEnabled(true);
    } catch (e) {
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Could not enable reminders."));
    } finally {
      setPushBusy(false);
    }
  }

  if (!isLoaded || phase === "loading") {
    return <DashboardSkeleton />;
  }

  if (phase === "error" && errorMsg) {
    return (
      <div className="plan-error">
        <p>{errorMsg}</p>
        <button type="button" className="plan-secondary-btn" onClick={() => void resolveView()}>
          Try again
        </button>
      </div>
    );
  }

  if (phase === "list") {
    return (
      <div className="plan-page">
        <PlanList
          plans={plans}
          deletingId={deletingId}
          onOpen={openPlan}
          onDelete={(id) => void onDelete(id)}
          onNewPlan={goToNewPlan}
        />
      </div>
    );
  }

  if (phase === "plan" && planData) {
    const isOverview = planData.plan.phase === "overview";

    return (
      <div className={`plan-page${isOverview ? "" : " plan-page--player"}`}>
        <div className="plan-toolbar">
          <button type="button" className="plan-link-btn" onClick={goToList}>
            ← All plans
          </button>
          <PlanToolbarMenu
            pushEnabled={pushEnabled}
            pushBusy={pushBusy}
            onTogglePush={() => void onTogglePush()}
            onDelete={() => void onDelete(planData.plan.id)}
          />
        </div>

        {errorMsg ? <p className="plan-banner plan-banner--warn">{errorMsg}</p> : null}

        {isOverview ? (
          <>
            <PlanOverview data={planData} initiating={initiating} onInitiate={() => void onInitiate()} />
            <PlanModifyBar loading={modifying} onModify={(t) => void onModify(t)} />
          </>
        ) : (
          <PlanExecution
            data={planData}
            onCompleteModule={(id) => void onCompleteModule(id)}
            completingModuleId={completingModuleId}
            generatingDayId={generatingDayId}
            onGenerateDay={(id) => void onGenerateDay(id)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="plan-page">
      <div className="plan-toolbar">
        <button type="button" className="plan-link-btn" onClick={goToList}>
          ← All plans
        </button>
      </div>
      {!resumeId ? (
        <p className="plan-banner plan-banner--warn">
          No resume found —{" "}
          <a href="/roast" className="plan-inline-link">
            upload and roast
          </a>{" "}
          first.
        </p>
      ) : null}
      <PlanForm
        companyName={companyName}
        role={role}
        interviewDate={interviewDate}
        jdText={jdText}
        loading={generating || phase === "generating"}
        onCompanyName={setCompanyName}
        onRole={setRole}
        onInterviewDate={setInterviewDate}
        onJdText={setJdText}
        onSubmit={() => {
          setPhase("generating");
          void onGenerate();
        }}
      />
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
