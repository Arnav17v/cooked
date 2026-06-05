"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { PaywallModal } from "@/components/billing/paywall-modal";
import { InDepthHirePill } from "@/components/indepth/indepth-hire-pill";
import { InDepthRadarChart } from "@/components/indepth/indepth-radar-chart";
import { InDepthSections } from "@/components/indepth/indepth-sections";
import {
  fetchInDepthAnalysis,
  generateInDepthAnalysis,
  PaymentRequiredError,
  type InDepthAnalysis,
  type InDepthGetResponse,
} from "@/lib/api";

const PROGRESS_STEPS = [
  "Reading your resume…",
  "Thinking like a hiring manager…",
  "Building your 30-day plan…",
] as const;

type Props = {
  resumeId: string;
  analysisId: string | null;
};

export function InDepthAnalysisTab({ resumeId, analysisId }: Props) {
  const { isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "loading" | "generating" | "ready" | "error" | "locked"
  >("idle");
  const [data, setData] = useState<InDepthAnalysis | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<PaymentRequiredError | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    const t = await getToken();
    return t ?? undefined;
  }, [getToken, isSignedIn]);

  const applyReady = useCallback((res: Extract<InDepthGetResponse, { status: "ready" }>) => {
    setData(res.indepth_analysis);
    setDegraded(res.degraded);
    setStatus("ready");
    setErr(null);
  }, []);

  const loadCached = useCallback(async () => {
    setStatus("loading");
    setErr(null);
    try {
      const token = await bearer();
      const auth = token ? { token } : undefined;
      const res = await fetchInDepthAnalysis(resumeId, auth);
      if (res.status === "locked") {
        setData(null);
        setStatus("locked");
        return;
      }
      if (res.status === "ready") {
        applyReady(res);
      } else {
        setData(null);
        setStatus("idle");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load analysis");
      setStatus("error");
    }
  }, [resumeId, bearer, applyReady]);

  useEffect(() => {
    void loadCached();
  }, [loadCached]);

  useEffect(() => {
    if (status !== "generating") {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      return;
    }
    setProgressIdx(0);
    progressTimer.current = setInterval(() => {
      setProgressIdx((i) => (i + 1) % PROGRESS_STEPS.length);
    }, 2800);
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [status]);

  async function onGenerate(regenerate = false) {
    if (!analysisId) {
      setErr("No completed analysis for this resume yet.");
      setStatus("error");
      return;
    }
    if (regenerate && !window.confirm("Regenerate in-depth analysis? This replaces the saved version.")) {
      return;
    }
    setStatus("generating");
    setErr(null);
    try {
      const token = await bearer();
      const auth = token ? { token } : undefined;
      const res = await generateInDepthAnalysis(resumeId, analysisId, auth, {
        regenerate,
      });
      applyReady(res);
    } catch (e) {
      if (e instanceof PaymentRequiredError) {
        setPaywall(e);
        setStatus(data ? "ready" : "locked");
        return;
      }
      setErr(e instanceof Error ? e.message : "Generation failed");
      setStatus(data ? "ready" : "idle");
    }
  }

  if (status === "locked") {
    return (
      <>
        <div className="indepth-locked-panel">
          <h3>In-Depth Analysis is Pro</h3>
          <p>Hiring-manager lens, interview forecast, competitive gaps, and a 30-day plan.</p>
          <Link href="/upgrade">Upgrade to Pro — $20/month</Link>
        </div>
        <PaywallModal
          open={paywall !== null}
          onClose={() => setPaywall(null)}
          error={paywall}
          code="indepth_locked"
        />
      </>
    );
  }

  if (status === "loading") {
    return <p className="indepth-muted">Loading in-depth analysis…</p>;
  }

  if (status === "idle" || (status === "error" && !data)) {
    return (
      <div className="indepth-empty">
        <p className="landing-section-eyebrow">In-depth</p>
        <h2 className="indepth-page-title">In-Depth Analysis</h2>
        <p className="indepth-lead">
          A hiring-manager lens on your resume — market position, interview forecast, competitive gaps,
          and a ranked 30-day plan. Not more flags; a different lens entirely.
        </p>
        <p className="indepth-muted">Takes about 30 seconds once you generate.</p>
        {err ? (
          <p className="indepth-error" role="alert">
            {err}
          </p>
        ) : null}
        <button
          type="button"
          className="plan-primary-btn"
          disabled={!analysisId}
          onClick={() => void onGenerate(false)}
        >
          Generate in-depth analysis
        </button>
      </div>
    );
  }

  if (status === "generating") {
    return (
      <div className="indepth-generating" aria-busy="true">
        <span className="plan-list-building-spinner" aria-hidden />
        <p className="indepth-generating-msg">{PROGRESS_STEPS[progressIdx]}</p>
        <p className="indepth-muted">Usually ~30 seconds.</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const mp = data.market_positioning;

  return (
    <div className="indepth-page">
      {degraded ? (
        <p className="plan-banner plan-banner--warn">Generated in degraded mode — retry later for a sharper pass.</p>
      ) : null}

      <header className="indepth-hero">
        <div className="indepth-hero-copy">
          <p className="landing-section-eyebrow">In-depth</p>
          <h2 className="indepth-page-title">In-Depth Analysis</h2>
          <p className="indepth-percentile-big">
            {mp.percentile}
            <span className="indepth-percentile-suffix">th percentile</span>
          </p>
          <p className="indepth-percentile-label">{mp.percentile_label}</p>
          <InDepthHirePill
            signal={data.hiring_manager_read.hire_signal}
            reasoning={data.hiring_manager_read.hire_reasoning}
          />
        </div>
        <InDepthRadarChart data={data} />
      </header>

      <InDepthSections data={data} />

      <footer className="indepth-footer">
        <button type="button" className="plan-link-btn" onClick={() => void onGenerate(true)}>
          Regenerate analysis
        </button>
      </footer>
    </div>
  );
}
