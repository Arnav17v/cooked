"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Upload, X } from "lucide-react";

import { PipelineProgress } from "@/components/ui/pipeline-progress";
import {
  formatBytes,
  LAST_RESUME_LS,
  ROAST_STEP_PROGRESS,
  STAGE_LINES,
  TARGET_ROLE_PLACEHOLDER,
  TARGET_ROLE_SUGGESTIONS,
} from "@/components/roast/roast-shared";
import {
  enqueueAnalyze,
  openAnalysisEventSource,
  RateLimitedError,
  uploadResumeMultipart,
  type AnalysisEventPayload,
} from "@/lib/api";

export function RoastUpload() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipSignedInRedirect = searchParams.get("new") === "1";

  const fileRef = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const { isSignedIn, getToken } = useAuth();

  const [role, setRole] = useState<string>("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [resumePaste, setResumePaste] = useState("");

  const [isRoasting, setIsRoasting] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runFinished, setRunFinished] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    const t = await getToken();
    return t ?? undefined;
  }, [getToken, isSignedIn]);

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
                  const reason = "reason" in payload ? String(payload.reason) : "error";
                  appendLine(`✗ failed: ${reason}`);
                  resolve(payload);
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
                  appendLine(`✗ failed`);
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
          reject(new Error("SSE connection dropped"));
        };
      });
    },
    [appendLine, setProgressPct],
  );

  const pasteWordCount = pasteMode
    ? resumePaste.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const hasStagedInput = Boolean(pickedFile) || (pasteMode && pasteWordCount >= 30);
  const hasRole = role.trim().length > 0;

  function clearFile() {
    setPickedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function roastResume() {
    if (!hasStagedInput || !role.trim()) return;

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

      const fd = new FormData();
      fd.append("target_role", role.trim());
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
      appendLine("→ enqueueing roast…");
      const queued = await enqueueAnalyze(uploaded.resume_id, auth);
      setProgressPct(28);

      const final = await waitForDone(queued.resume_id, queued.analysis_id, startedAt);
      setProgressPct(100);

      if (final.step === "error") {
        throw new Error(final.reason === "quota_exceeded" ? "Daily limit" : final.reason);
      }

      try {
        window.localStorage.setItem(LAST_RESUME_LS, queued.resume_id);
      } catch {
        /* ignore */
      }

      router.push(`/dashboard?resume=${queued.resume_id}`);
    } catch (e) {
      const msg =
        e instanceof RateLimitedError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Request failed";
      if (e instanceof RateLimitedError) {
        setRateLimited(true);
      }
      setErrorMessage(msg);
      appendLine(`✗ ${msg}`);
      setRunFinished(true);
    } finally {
      setIsRoasting(false);
    }
  }

  function resetForm() {
    clearFile();
    setResumePaste("");
    setPasteMode(false);
    setTerminalLines([]);
    setRunFinished(false);
    setErrorMessage(null);
    setRateLimited(false);
    setProgressPct(0);
  }

  return (
    <>
      {skipSignedInRedirect ? (
        <p className="mb-4 text-[13px] text-lc-muted">
          Uploading a new resume —{" "}
          <Link href="/dashboard" className="text-lc-orange hover:underline">
            Back to dashboard
          </Link>
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-6">
          <label className="block">
            <span className="mb-2 block text-[12px] font-medium text-lc-muted">Target role</span>
            <input
              type="text"
              list="cooked-target-role-suggestions"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isRoasting}
              maxLength={128}
              placeholder={TARGET_ROLE_PLACEHOLDER}
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-lc-border bg-lc-elevated px-3 text-[14px] text-lc-text outline-none transition-colors placeholder:text-lc-dim focus:border-lc-orange disabled:opacity-50"
            />
            <datalist id="cooked-target-role-suggestions">
              {TARGET_ROLE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <p className="mt-1.5 text-[11px] leading-relaxed text-lc-dim">
              Type the job you are aiming for — any title is fine. Examples: software developer, data
              analyst, marketing lead, PM intern, UX researcher.
            </p>
          </label>

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f) {
                setPickedFile(f);
                setPasteMode(false);
              }
            }}
          />

          {!pickedFile && !pasteMode ? (
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
                  setPasteMode(false);
                }
              }}
              className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-lc-border bg-lc-surface px-6 py-12 text-center transition-colors hover:border-lc-orange/50 disabled:opacity-50"
            >
              <Upload className="mb-3 h-10 w-10 text-lc-dim" strokeWidth={1.5} />
              <p className="text-[15px] font-medium text-lc-text">Drop your resume here (.pdf)</p>
              <p className="mt-1 text-[12px] text-lc-dim">or click to choose a file</p>
            </button>
          ) : pickedFile ? (
            <div className="flex items-center gap-3 rounded-lg border border-lc-border bg-lc-surface px-4 py-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-lc-text">
                {pickedFile.name}
                <span className="text-lc-dim"> · {formatBytes(pickedFile.size)}</span>
              </span>
              <button
                type="button"
                disabled={isRoasting}
                onClick={clearFile}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-lc-border text-lc-muted hover:bg-lc-elevated hover:text-lc-text disabled:opacity-50"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <textarea
                value={resumePaste}
                onChange={(e) => setResumePaste(e.target.value)}
                disabled={isRoasting}
                placeholder="Paste resume text…"
                rows={12}
                spellCheck={false}
                className="w-full resize-y rounded-lg border border-lc-border bg-[#1a1a1a] p-4 font-mono text-[13px] leading-6 text-lc-text outline-none focus:border-lc-orange disabled:opacity-50"
              />
              <p className="mt-2 text-[11px] text-lc-dim">Minimum ~30 words before you can run.</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {!pickedFile && !pasteMode ? (
              <button
                type="button"
                disabled={isRoasting}
                onClick={() => {
                  setPasteMode(true);
                  clearFile();
                }}
                className="text-[13px] text-lc-orange hover:underline disabled:opacity-50"
              >
                Paste text instead
              </button>
            ) : pasteMode ? (
              <button
                type="button"
                disabled={isRoasting}
                onClick={() => {
                  setPasteMode(false);
                  setResumePaste("");
                }}
                className="text-[13px] text-lc-orange hover:underline disabled:opacity-50"
              >
                Use PDF instead
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void roastResume()}
              disabled={isRoasting || !hasStagedInput || !hasRole}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-lc-orange px-6 text-[14px] font-semibold text-black transition-colors hover:bg-lc-orangeHover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="h-4 w-4 fill-current" strokeWidth={2.5} />
              {isRoasting ? "Running…" : "Run roast"}
            </button>
            {runFinished ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-lc-border px-5 text-[13px] font-medium text-lc-text hover:bg-lc-elevated"
              >
                Clear & try again
              </button>
            ) : null}
          </div>

          <p className="text-[11px] leading-relaxed text-lc-dim">
            Resume text is processed on our backend and sent to AI providers. Raw text is deleted within
            24 hours; roast output and your share link stay until you delete them.
          </p>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-xl border border-lc-border bg-lc-surface">
          <div className="border-b border-lc-border bg-lc-header px-4 py-2.5 font-mono text-[11px] text-lc-muted">
            roast.log
          </div>

          <div className="flex flex-1 flex-col p-5">
            {isRoasting ? <PipelineProgress className="mb-4" percent={progressPct} /> : null}
            <div className="min-h-[140px] font-mono text-[12px] leading-relaxed text-lc-muted">
              {terminalLines.length === 0 ? (
                <span className="text-lc-dim">—</span>
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
              <div className="mt-4 rounded-lg border border-lc-hard/40 bg-lc-hard/10 p-3 text-[13px] text-lc-text">
                <span className="font-mono text-lc-hard">429</span> {errorMessage}
              </div>
            ) : null}

            {!rateLimited && errorMessage && runFinished ? (
              <div className="mt-4 rounded-lg border border-lc-orange/25 bg-lc-orange/5 p-3 text-[13px] text-lc-muted">
                <span className="text-lc-text">{errorMessage}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
