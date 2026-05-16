"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

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
        <p className="landing-back-hint">
          Uploading a new resume — <Link href="/dashboard">Back to dashboard</Link>
        </p>
      ) : null}

      <div className="landing-roast-grid">
        <div className="landing-roast-col">
          <label className="block">
            <span className="landing-field-label">Target role</span>
            <input
              type="text"
              list="cooked-target-role-suggestions"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isRoasting}
              maxLength={128}
              placeholder={TARGET_ROLE_PLACEHOLDER}
              autoComplete="off"
              className="landing-field-input"
            />
            <datalist id="cooked-target-role-suggestions">
              {TARGET_ROLE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <p className="landing-field-hint">
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
              className="landing-roast-dropzone"
            >
              <Upload className="landing-roast-dropzone-icon h-10 w-10" strokeWidth={1.5} />
              <p className="landing-roast-dropzone-title">Drop your resume here (.pdf)</p>
              <p className="landing-roast-dropzone-hint">or click to choose a file</p>
            </button>
          ) : pickedFile ? (
            <div className="landing-roast-file-row">
              <span className="landing-roast-file-name">
                {pickedFile.name}
                <span className="landing-roast-file-meta"> · {formatBytes(pickedFile.size)}</span>
              </span>
              <button
                type="button"
                disabled={isRoasting}
                onClick={clearFile}
                className="landing-roast-file-remove"
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
                className="landing-roast-textarea"
              />
              <p className="landing-field-hint">Minimum ~30 words before you can run.</p>
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
                className="landing-text-link"
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
                className="landing-text-link"
              >
                Use PDF instead
              </button>
            ) : null}
          </div>

          <div className="landing-roast-actions">
            <button
              type="button"
              onClick={() => void roastResume()}
              disabled={isRoasting || !hasStagedInput || !hasRole}
              className="landing-btn-primary"
            >
              <span>{isRoasting ? "Running…" : "Run roast"}</span>
            </button>
            {runFinished ? (
              <button type="button" onClick={resetForm} className="landing-btn-ghost">
                Clear & try again
              </button>
            ) : null}
          </div>

          <p className="landing-roast-disclaimer">
            Resume text is processed on our backend and sent to AI providers. Raw text is deleted within
            24 hours; roast output and your share link stay until you delete them.
          </p>
        </div>

        <div className="landing-log-panel">
          <div className="landing-log-header">roast.log</div>

          <div className="landing-log-body">
            {isRoasting ? (
              <PipelineProgress className="mb-4" percent={progressPct} tone="landing" />
            ) : null}
            <div className="landing-log-lines">
              {terminalLines.length === 0 ? (
                <span className="landing-log-empty">—</span>
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
              <div className="landing-alert-rate">
                <code>429</code> {errorMessage}
              </div>
            ) : null}

            {!rateLimited && errorMessage && runFinished ? (
              <div className="landing-alert-error">{errorMessage}</div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
