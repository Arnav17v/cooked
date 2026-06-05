"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ClipboardPaste, Upload, X } from "lucide-react";

import { PipelineProgress } from "@/components/ui/pipeline-progress";
import { PaywallModal } from "@/components/billing/paywall-modal";
import {
  formatBytes,
  LAST_RESUME_LS,
  ROAST_STEP_PROGRESS,
  STAGE_LINES,
  EXPERIENCE_LEVEL_OPTIONS,
  formatRoastFailure,
  TARGET_ROLE_PLACEHOLDER,
  TARGET_ROLE_SUGGESTIONS,
  type ExperienceLevelId,
} from "@/components/roast/roast-shared";
import {
  enqueueAnalyze,
  fetchEntitlements,
  openAnalysisEventSource,
  PaymentRequiredError,
  RateLimitedError,
  uploadResumeMultipart,
  type AnalysisEventPayload,
} from "@/lib/api";
import { showLlmDevToast, type LlmDevEvent } from "@/lib/llm-dev-toast";
import { useStableClerkBearer } from "@/lib/use-stable-clerk-bearer";

const fieldInputClass =
  "roast-field-input w-full h-12 px-3.5 text-sm text-lv-cream bg-lv-surface border border-lv-rule outline-none transition-colors focus:border-lv-rust disabled:opacity-50 placeholder:text-lv-cream/35";

const selectChevron =
  "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%23a89880%22%20d%3D%22M1%201l5%205%205-5%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_8px] bg-[position:right_14px_center] bg-no-repeat";

type ResumeInputMode = "pdf" | "paste";

function RoastPrimaryButton({
  children,
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden bg-lv-cream px-5 py-3.5 font-jetbrains text-xs font-medium uppercase tracking-widest text-lv-black transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto lg:justify-center ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-lv-rust transition-transform duration-300 ease-lv group-hover:translate-x-0"
      />
      <span className="relative z-10 transition-colors group-hover:text-lv-cream">{children}</span>
    </button>
  );
}

export function RoastUpload() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipSignedInRedirect = searchParams.get("new") === "1";

  const fileRef = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState<string>("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevelId | "">("");
  const [resumeInputMode, setResumeInputMode] = useState<ResumeInputMode>("pdf");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [resumePaste, setResumePaste] = useState("");

  const [isRoasting, setIsRoasting] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runFinished, setRunFinished] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [paywall, setPaywall] = useState<PaymentRequiredError | null>(null);

  const bearer = useStableClerkBearer();

  const appendLine = useCallback((line: string) => {
    setTerminalLines((prev) => [...prev, line]);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  const waitForDone = useCallback(
    (resumeId: string, analysisId: string, startedAt: number) => {
      return new Promise<AnalysisEventPayload>((resolve, reject) => {
        esRef.current?.close();
        const seenSteps = new Set<string>();
        let queuedPrinted = false;
        const es = openAnalysisEventSource(resumeId, analysisId);
        esRef.current = es;

        es.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data) as AnalysisEventPayload & {
              status?: string;
              pipeline_stage?: string | null;
            };

            if ("step" in payload && typeof payload.step === "string") {
              if (payload.step === "llm_dev") {
                showLlmDevToast(payload as LlmDevEvent);
                return;
              }
              if (payload.step === "extracting" && !queuedPrinted) {
                queuedPrinted = true;
                appendLine("→ queued…");
              }
              if (
                payload.step !== "done" &&
                payload.step !== "error" &&
                !seenSteps.has(payload.step)
              ) {
                seenSteps.add(payload.step);
                const line = STAGE_LINES[payload.step];
                if (line) appendLine(line);
                const pct = ROAST_STEP_PROGRESS[payload.step];
                if (pct != null) setProgressPct(pct);
              }

              if (payload.step === "done" || payload.step === "error") {
                es.close();
                esRef.current = null;
                const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
                if (payload.step === "done") {
                  appendLine(`✓ done in ${secs}s`);
                  resolve(payload);
                } else {
                  const reason = "reason" in payload ? String(payload.reason) : "unknown";
                  resolve({ ...payload, step: "error", reason });
                }
                return;
              }
            }
            if ("status" in payload) {
              if (payload.status === "pending" && !queuedPrinted) {
                queuedPrinted = true;
                appendLine("→ queued…");
              }
              if (payload.status === "pending" || payload.status === "processing") {
                const stage =
                  "pipeline_stage" in payload && typeof payload.pipeline_stage === "string"
                    ? payload.pipeline_stage
                    : null;
                if (stage && !seenSteps.has(stage)) {
                  seenSteps.add(stage);
                  const mapped =
                    stage === "scoring_resume"
                      ? "→ scoring…"
                      : stage === "flagging_weak_bullets"
                        ? "→ flagging weak bullets…"
                        : stage === "generating_questions"
                          ? "→ generating interview questions…"
                          : null;
                  if (mapped) appendLine(mapped);
                  const stageKey =
                    stage === "scoring_resume"
                      ? "scoring"
                      : stage === "flagging_weak_bullets"
                        ? "flagging"
                        : stage === "generating_questions"
                          ? "questions"
                          : stage === "extracting"
                            ? "extracting"
                            : null;
                  if (stageKey) {
                    const pct = ROAST_STEP_PROGRESS[stageKey];
                    if (pct != null) setProgressPct(pct);
                  }
                }
              }
              if (payload.status === "done" || payload.status === "failed") {
                es.close();
                esRef.current = null;
                const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
                if (payload.status === "done") {
                  appendLine(`✓ done in ${secs}s`);
                  resolve({
                    step: "done",
                    resume_id: resumeId,
                  });
                } else {
                  resolve({ step: "error", reason: "analysis_failed" });
                }
                return;
              }
            }
          } catch (e) {
            es.close();
            esRef.current = null;
            reject(e);
          }
        };

        es.onerror = () => {
          es.close();
          esRef.current = null;
          reject(new Error("sse_connection_dropped"));
        };
      });
    },
    [appendLine, setProgressPct],
  );

  const pasteWordCount =
    resumeInputMode === "paste" ? resumePaste.trim().split(/\s+/).filter(Boolean).length : 0;

  const hasStagedInput =
    resumeInputMode === "pdf" ? Boolean(pickedFile) : pasteWordCount >= 30;
  const hasRole = role.trim().length > 0;
  const hasExperience = experienceLevel !== "";

  function clearFile() {
    setPickedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function switchResumeInputMode(mode: ResumeInputMode) {
    if (isRoasting || mode === resumeInputMode) return;
    if (mode === "pdf") {
      setResumePaste("");
    } else {
      clearFile();
    }
    setResumeInputMode(mode);
  }

  function showRoastFailure(raw: string, opts?: { rateLimited?: boolean }) {
    const friendly = formatRoastFailure(raw);
    if (opts?.rateLimited) {
      setRateLimited(true);
    }
    setErrorMessage(friendly);
    appendLine(`✗ ${friendly}`);
    setRunFinished(true);
  }

  async function roastResume() {
    if (!hasStagedInput || !role.trim() || !experienceLevel) return;

    setIsRoasting(true);
    setRateLimited(false);
    setErrorMessage(null);
    setRunFinished(false);
    setTerminalLines([]);
    setProgressPct(5);

    const startedAt = Date.now();

    try {
      const token = await bearer();
      const auth = token ? { token } : undefined;

      if (token) {
        const ent = await fetchEntitlements(token);
        if (
          ent.plan === "free" &&
          ent.usage.resumes_count >= ent.usage.resumes_limit
        ) {
          setPaywall(
            new PaymentRequiredError({
              code: "resume_limit_reached",
              message: `You've uploaded ${ent.usage.resumes_count}/${ent.usage.resumes_limit} resumes. Upgrade to Pro for unlimited uploads.`,
              usage: {
                current: ent.usage.resumes_count,
                limit: ent.usage.resumes_limit,
              },
              upgrade_url: "/upgrade",
            }),
          );
          setRunFinished(true);
          return;
        }
      }

      const fd = new FormData();
      fd.append("target_role", role.trim());
      fd.append("experience_level", experienceLevel);
      if (pickedFile) {
        fd.append("file", pickedFile);
      } else {
        fd.append("resume_text", resumePaste);
      }

      setProgressPct(12);
      appendLine("→ extracting text…");
      const uploaded = await uploadResumeMultipart(fd, auth);
      setProgressPct(22);
      appendLine("✓ extracted");
      if (uploaded.truncated) {
        appendLine("(truncated to 4000-word cap)");
      }

      setProgressPct(26);
      appendLine("→ starting Resume Score…");
      const queued = await enqueueAnalyze(uploaded.resume_id, auth);
      setProgressPct(28);

      const final = await waitForDone(queued.resume_id, queued.analysis_id, startedAt);
      setProgressPct(100);

      if (final.step === "error") {
        const reason = "reason" in final ? String(final.reason) : "unknown";
        showRoastFailure(reason);
        return;
      }

      try {
        window.localStorage.setItem(LAST_RESUME_LS, queued.resume_id);
      } catch {
        /* ignore */
      }

      router.push(`/dashboard?resume=${queued.resume_id}`);
    } catch (e) {
      if (e instanceof PaymentRequiredError) {
        setPaywall(e);
        setRunFinished(true);
        return;
      }
      const raw =
        e instanceof RateLimitedError
          ? e.message
          : e instanceof Error
            ? e.message
            : "unknown";
      showRoastFailure(raw, { rateLimited: e instanceof RateLimitedError });
    } finally {
      setIsRoasting(false);
    }
  }

  function resetForm() {
    clearFile();
    setResumePaste("");
    setResumeInputMode("pdf");
    setTerminalLines([]);
    setRunFinished(false);
    setErrorMessage(null);
    setRateLimited(false);
    setProgressPct(0);
    setExperienceLevel("");
  }

  return (
    <>
      {skipSignedInRedirect ? (
        <p className="mb-4 text-xs leading-relaxed text-lv-cream-dim sm:mb-6 sm:text-[13px]">
          Uploading a new resume —{" "}
          <Link
            href="/dashboard"
            className="text-lv-rust no-underline hover:text-lv-cream hover:underline"
          >
            Back to dashboard
          </Link>
        </p>
      ) : null}

      {/*
        Mobile: fields → actions → log → disclaimer.
        Desktop: form + actions + disclaimer in col 1; log sticky in col 2.
      */}
      <div className="grid min-w-0 grid-cols-1 gap-7 lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
          <label className="block">
            <span className="mb-2 block font-jetbrains text-[11px] uppercase tracking-widest text-lv-cream-dim">
              Target role
            </span>
            <input
              type="text"
              list="cooked-target-role-suggestions"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isRoasting}
              maxLength={128}
              placeholder={TARGET_ROLE_PLACEHOLDER}
              autoComplete="off"
              className={fieldInputClass}
            />
            <datalist id="cooked-target-role-suggestions">
              {TARGET_ROLE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <p className="mt-2 text-[11px] leading-relaxed text-lv-cream/45">
              Type the job you are aiming for — any title is fine. Examples: software developer, data
              analyst, marketing lead, PM intern, UX researcher.
            </p>
          </label>

          <label className="block">
            <span className="mb-2 block font-jetbrains text-[11px] uppercase tracking-widest text-lv-cream-dim">
              Experience level
            </span>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevelId | "")}
              disabled={isRoasting}
              className={`roast-field-select ${fieldInputClass} appearance-none pr-9 ${selectChevron}`}
            >
              <option value="">Select one…</option>
              {EXPERIENCE_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] leading-relaxed text-lv-cream/45">
              {experienceLevel
                ? EXPERIENCE_LEVEL_OPTIONS.find((o) => o.value === experienceLevel)?.hint
                : "Helps calibrate your Resume Score — e.g. don’t score a fresher like a staff engineer."}
            </p>
          </label>

          <div>
            <span className="mb-2 block font-jetbrains text-[11px] uppercase tracking-widest text-lv-cream-dim">
              Resume
            </span>
            <div
              role="tablist"
              aria-label="Resume input method"
              className="mb-3 grid grid-cols-2 border border-lv-rule"
            >
              <button
                type="button"
                role="tab"
                aria-selected={resumeInputMode === "pdf"}
                disabled={isRoasting}
                onClick={() => switchResumeInputMode("pdf")}
                className={`roast-input-mode-tab flex items-center justify-center gap-2 px-3 py-2.5 font-jetbrains text-[11px] uppercase tracking-wide transition-colors disabled:opacity-50 ${
                  resumeInputMode === "pdf"
                    ? "bg-lv-rust text-lv-cream"
                    : "bg-lv-surface text-lv-cream-dim hover:text-lv-cream"
                }`}
              >
                <Upload className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                Upload PDF
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={resumeInputMode === "paste"}
                disabled={isRoasting}
                onClick={() => switchResumeInputMode("paste")}
                className={`roast-input-mode-tab flex items-center justify-center gap-2 border-l border-lv-rule px-3 py-2.5 font-jetbrains text-[11px] uppercase tracking-wide transition-colors disabled:opacity-50 ${
                  resumeInputMode === "paste"
                    ? "bg-lv-rust text-lv-cream"
                    : "bg-lv-surface text-lv-cream-dim hover:text-lv-cream"
                }`}
              >
                <ClipboardPaste className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                Paste text
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) setPickedFile(f);
              }}
            />

            {resumeInputMode === "pdf" && !pickedFile ? (
            <button
              type="button"
              disabled={isRoasting}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f?.type === "application/pdf") {
                  setPickedFile(f);
                }
              }}
              className="roast-dropzone flex min-h-[168px] w-full flex-col items-center justify-center border border-dashed border-lv-rust/35 bg-lv-surface px-4 py-10 text-center transition-colors hover:border-lv-rust hover:bg-lv-rust/[0.04] disabled:opacity-50 sm:min-h-[220px] sm:px-6 sm:py-12"
            >
              <Upload
                className="mb-3 h-10 w-10 text-lv-rust/70"
                strokeWidth={1.5}
              />
              <p className="text-[15px] font-medium text-lv-cream">Drop your resume here (.pdf)</p>
              <p className="mt-1.5 font-jetbrains text-[11px] tracking-wide text-lv-cream-dim">
                or click to choose a file
              </p>
            </button>
          ) : resumeInputMode === "pdf" && pickedFile ? (
            <div className="flex items-center gap-3 border border-lv-rule bg-lv-surface px-4 py-3.5">
              <span className="min-w-0 flex-1 truncate font-jetbrains text-[13px] text-lv-cream">
                {pickedFile.name}
                <span className="text-lv-cream-dim"> · {formatBytes(pickedFile.size)}</span>
              </span>
              <button
                type="button"
                disabled={isRoasting}
                onClick={clearFile}
                className="roast-file-remove flex h-8 w-8 shrink-0 items-center justify-center border border-lv-rule bg-transparent text-lv-cream-dim transition-colors hover:border-lv-cream-dim hover:text-lv-cream disabled:opacity-50"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : resumeInputMode === "paste" ? (
            <div>
              <textarea
                value={resumePaste}
                onChange={(e) => setResumePaste(e.target.value)}
                disabled={isRoasting}
                placeholder="Paste your full resume here — experience, projects, education…"
                rows={12}
                spellCheck={false}
                className="roast-textarea w-full min-h-[200px] resize-y border border-lv-rule bg-lv-surface p-4 font-jetbrains text-[13px] leading-relaxed text-lv-cream outline-none focus:border-lv-rust disabled:opacity-50 sm:min-h-[280px]"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-lv-cream/45">
                {pasteWordCount >= 30
                  ? `${pasteWordCount} words — ready to score`
                  : `Minimum ~30 words (${pasteWordCount} so far)`}
              </p>
            </div>
          ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:col-start-1 lg:row-start-2">
          <RoastPrimaryButton
            onClick={() => void roastResume()}
            disabled={isRoasting || !hasStagedInput || !hasRole || !hasExperience}
            className="sm:flex-1 lg:flex-none"
          >
            {isRoasting ? "Running…" : "Score my resume"}
          </RoastPrimaryButton>
          {runFinished ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex w-full items-center justify-center border-b border-lv-rule pb-0.5 font-jetbrains text-xs uppercase tracking-wide text-lv-cream-dim transition-colors hover:border-lv-cream-dim hover:text-lv-cream sm:w-auto"
            >
              Clear & try again
            </button>
          ) : null}
        </div>

        <div className="flex min-h-[260px] flex-col border border-lv-rule bg-lv-surface lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:min-h-[420px] lg:self-stretch">
          <div className="border-b border-lv-rule bg-lv-black/50 px-4 py-3 font-jetbrains text-[11px] tracking-wide text-lv-cream-dim">
            roast.log
          </div>

          <div className="flex flex-1 flex-col p-4 sm:p-5">
            {isRoasting ? (
              <PipelineProgress className="mb-4" percent={progressPct} tone="landing" />
            ) : null}
            <div className="min-h-[100px] flex-1 font-jetbrains text-xs leading-7 text-lv-cream-dim sm:min-h-[140px]">
              {terminalLines.length === 0 ? (
                <span className="text-lv-cream/25">—</span>
              ) : (
                terminalLines.map((line, i) => (
                  <div key={`${i}-${line.slice(0, 12)}`} className="whitespace-pre-wrap">
                    {line}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>

            {rateLimited && errorMessage ? (
              <div className="mt-4 border border-lv-rust/50 bg-lv-rust/[0.08] p-3.5 text-[13px] text-lv-cream">
                <code className="font-jetbrains text-lv-rust">429</code> {errorMessage}
              </div>
            ) : null}

            {!rateLimited && errorMessage && runFinished ? (
              <div className="mt-4 border border-lv-rust/25 bg-lv-rust/[0.05] p-3.5 text-[13px] text-lv-cream-dim">
                {errorMessage}
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-lv-cream/40 lg:col-start-1 lg:row-start-3">
          Resume text is processed on our backend and sent to AI providers. We keep your raw text so you
          can run quizzes and follow-ups on the same roast; roast output and your share link stay until you
          replace the upload.
        </p>
      </div>
      <PaywallModal open={paywall !== null} onClose={() => setPaywall(null)} error={paywall} />
    </>
  );
}
