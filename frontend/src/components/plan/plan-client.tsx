"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { DashboardSkeleton } from "@/components/roast/dashboard-skeleton";
import { PaywallModal } from "@/components/billing/paywall-modal";
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
  fetchEntitlements,
  fetchMyRoasts,
  generatePrepPlan,
  generatePrepPlanDayModules,
  getPlanVapidPublicKey,
  getPrepPlan,
  initiatePrepPlan,
  listPrepPlans,
  modifyPrepPlan,
  subscribePlanPush,
  PaymentRequiredError,
  type ActivePlanResponse,
  type EntitlementsResponse,
  type PrepPlanSummaryDto,
} from "@/lib/api";
import { useStableClerkBearer } from "@/lib/use-stable-clerk-bearer";

type Phase = "loading" | "list" | "form" | "generating" | "plan" | "error";

const PLAN_SW_URL = "/plan-sw.js";

export function PlanClient() {
  const { isSignedIn, isLoaded } = useAuth();
  const bearer = useStableClerkBearer();
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
  const [daysCount, setDaysCount] = useState(7);
  const [jdText, setJdText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [initiatingPlanId, setInitiatingPlanId] = useState<string | null>(null);
  const [generatingDayId, setGeneratingDayId] = useState<string | null>(null);
  const [modifying, setModifying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingModuleId, setCompletingModuleId] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<PaymentRequiredError | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsResponse | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const skipPlanQueryRefetch = useRef(true);
  const entitlementsRef = useRef(entitlements);
  const planBootstrapKeyRef = useRef<string | null>(null);

  entitlementsRef.current = entitlements;

  function handlePaywallError(e: unknown): boolean {
    if (e instanceof PaymentRequiredError) {
      setPaywall(e);
      return true;
    }
    return false;
  }

  const planLimitReached =
    entitlements?.plan === "free" &&
    entitlements.usage.plans_count >= entitlements.usage.plans_limit;

  const openPlanLimitPaywall = useCallback((source?: EntitlementsResponse | null) => {
    const usage = (source ?? entitlementsRef.current)?.usage;
    if (!usage) return;
    setPaywall(
      new PaymentRequiredError({
        code: "plan_limit_reached",
        message: `You already have ${usage.plans_count}/${usage.plans_limit} prep plan${usage.plans_limit === 1 ? "" : "s"}. Upgrade to Pro for unlimited plans.`,
        usage: { current: usage.plans_count, limit: usage.plans_limit },
        upgrade_url: "/upgrade",
      }),
    );
  }, []);

  function tryGoToNewPlan() {
    if (planLimitReached) {
      openPlanLimitPaywall();
      return;
    }
    goToNewPlan();
  }

  const loadList = useCallback(async () => {
    const token = await bearer();
    if (!token) {
      setPhase("list");
      return [];
    }
    try {
      const ent = await fetchEntitlements(token);
      setEntitlements(ent);
    } catch {
      setEntitlements(null);
    }
    const out = await listPrepPlans(token);
    setPlans(out.plans);
    setPhase("list");
    return out.plans;
  }, [bearer]);

  const hasBuildingPlans = plans.some((p) => p.initiation_status === "running");

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
      try {
        const ent = await fetchEntitlements(token);
        setEntitlements(ent);
        if (ent.plan === "free" && ent.usage.plans_count >= ent.usage.plans_limit) {
          openPlanLimitPaywall(ent);
          await loadList();
          router.replace("/plan");
          return;
        }
      } catch {
        /* fall through to form */
      }
      setPlanData(null);
      setPhase("form");
      return;
    }
    await loadList();
  }, [bearer, planQuery, newQuery, loadPlan, loadList, router, openPlanLimitPaywall]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      planBootstrapKeyRef.current = null;
      router.replace("/sign-in?redirect_url=/plan");
      return;
    }

    const bootstrapKey = `${resumeQuery ?? ""}:${newQuery ?? ""}:${planQuery ?? ""}`;
    if (planBootstrapKeyRef.current === bootstrapKey) {
      return;
    }

    let cancelled = false;

    (async () => {
      const q = resumeQuery?.trim();
      const needsRoasts = newQuery === "1";

      if (q) {
        if (!cancelled) setResumeId(q);
      } else if (needsRoasts) {
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
          planBootstrapKeyRef.current = bootstrapKey;
        } catch (e) {
          setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Could not load plans."));
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, resumeQuery, newQuery, planQuery, bearer, resolveView, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (skipPlanQueryRefetch.current) {
      skipPlanQueryRefetch.current = false;
      return;
    }

    const bootstrapKey = `${resumeQuery ?? ""}:${newQuery ?? ""}:${planQuery ?? ""}`;
    if (planBootstrapKeyRef.current === bootstrapKey) {
      return;
    }

    void resolveView()
      .then(() => {
        planBootstrapKeyRef.current = bootstrapKey;
      })
      .catch((e) => {
        setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Could not load plans."));
        setPhase("error");
      });
  }, [planQuery, newQuery, resumeQuery, isLoaded, isSignedIn, resolveView]);

  useEffect(() => {
    if (phase !== "list" || !hasBuildingPlans) return;
    const id = window.setInterval(() => {
      void loadList();
    }, 4000);
    return () => window.clearInterval(id);
  }, [phase, hasBuildingPlans, loadList]);

  useEffect(() => {
    const planId = planData?.plan.id;
    if (phase !== "plan" || !planId || planData.plan.initiation_status !== "running") return;

    let cancelled = false;
    const id = window.setInterval(() => {
      void (async () => {
        const token = await bearer();
        if (!token || cancelled) return;
        try {
          const out = await getPrepPlan(planId, token);
          if (!cancelled) setPlanData(out);
        } catch {
          /* keep last snapshot */
        }
      })();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, planData?.plan.id, planData?.plan.initiation_status, bearer]);

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
    setPhase("loading");
    router.push(`/plan?plan=${planId}`);
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
          days_count: daysCount,
          jd_text: jdText.trim(),
        },
        token,
      );
      setPlanData(out);
      router.push(`/plan?plan=${out.plan.id}`);
      setPhase("plan");
    } catch (e) {
      if (handlePaywallError(e)) {
        setPhase("form");
        return;
      }
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
      if (handlePaywallError(e)) return;
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Update failed."));
    } finally {
      setModifying(false);
    }
  }

  async function onInitiate(planId?: string) {
    const id = planId ?? planData?.plan.id;
    if (!id) return;
    const token = await bearer();
    if (!token) return;
    setInitiating(true);
    setInitiatingPlanId(id);
    setErrorMsg(null);
    try {
      await initiatePrepPlan(id, token);
      setPlanData(null);
      skipPlanQueryRefetch.current = true;
      router.push("/plan");
      setPhase("list");
      await loadList();
    } catch (e) {
      if (handlePaywallError(e)) return;
      setErrorMsg(formatRoastFailure(e instanceof Error ? e.message : "Could not start plan."));
    } finally {
      setInitiating(false);
      setInitiatingPlanId(null);
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
      if (handlePaywallError(e)) return;
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
      if (handlePaywallError(e)) return;
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
      <>
        <div className="plan-page">
          <PlanList
            plans={plans}
            deletingId={deletingId}
            initiatingPlanId={initiatingPlanId}
            onOpen={openPlan}
            onDelete={(id) => void onDelete(id)}
            onNewPlan={tryGoToNewPlan}
            onRetryInitiate={(id) => void onInitiate(id)}
          />
        </div>
        <PaywallModal open={paywall !== null} onClose={() => setPaywall(null)} error={paywall} />
      </>
    );
  }

  if (phase === "plan" && planData) {
    const isOverview = planData.plan.phase === "overview";
    const initiationRunning = planData.plan.initiation_status === "running";
    const initiationFailed = planData.plan.initiation_status === "failed";

    return (
      <>
      <div className={`plan-page${isOverview ? "" : " plan-page--player"}`}>
        <div className="plan-toolbar">
          <button type="button" className="plan-back-btn" onClick={goToList}>
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
            <PlanOverview
              data={planData}
              initiating={initiating}
              initiationRunning={initiationRunning}
              initiationFailed={initiationFailed}
              initiationError={planData.plan.initiation_error}
              onInitiate={() => void onInitiate()}
              onGoToList={goToList}
            />
            <PlanModifyBar
              loading={modifying || initiationRunning}
              onModify={(t) => void onModify(t)}
            />
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
        <PaywallModal open={paywall !== null} onClose={() => setPaywall(null)} error={paywall} />
      </>
    );
  }

  return (
    <>
      <div className="plan-page">
        <div className="plan-toolbar">
          <button type="button" className="plan-back-btn" onClick={goToList}>
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
        daysCount={daysCount}
        jdText={jdText}
        loading={generating || phase === "generating"}
        onCompanyName={setCompanyName}
        onRole={setRole}
        onDaysCount={setDaysCount}
        onJdText={setJdText}
        onSubmit={() => {
          setPhase("generating");
          void onGenerate();
        }}
      />
      </div>
      <PaywallModal open={paywall !== null} onClose={() => setPaywall(null)} error={paywall} />
    </>
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
