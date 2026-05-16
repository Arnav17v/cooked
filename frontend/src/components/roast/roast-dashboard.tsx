"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  isStructuredFlag,
  isUuidShape,
  LAST_RESUME_LS,
  normalizeHeatLabel,
  type ResultTabId,
} from "@/components/roast/roast-shared";
import { NotesStudyPage } from "@/components/notes/notes-study-page";
import { ScoreCard, scoreHeatColor } from "@/components/score/ScoreCard";
import { ScoreShareActions } from "@/components/score/ScoreShareActions";
import { QuizLengthPicker } from "@/components/interview/quiz-length-picker";
import { QuizImprovementChart } from "@/components/roast/QuizImprovementChart";
import { quizCountForLength, type QuizLengthId } from "@/lib/quiz-length";
import {
  type FlagsResponse,
  type MyRoastItem,
  type QuestionItem,
  type ScoreResponse,
  fetchMyRoasts,
  getFlags,
  getQuestions,
  getScore,
} from "@/lib/api";
import { QUIZ_START_HANDOFF_KEY, type QuizStartHandoff } from "@/lib/interview-quiz-start-handoff";
import { openQuizStartInNewTab } from "@/lib/open-quiz-start-tab";
import {
  parseInterviewQuizScores,
  type StoredQuizScore,
} from "@/lib/interview-quiz-scores";

const NAV: { id: ResultTabId; label: string }[] = [
  { id: "score", label: "score" },
  { id: "flags", label: "flags" },
  { id: "questions", label: "questions" },
  { id: "notes", label: "notes" },
];

function formatResumeDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function heatMeaningLine(heatLabel: string): string {
  const h = normalizeHeatLabel(heatLabel);
  const map: Record<string, string> = {
    Raw: "very early signal — interviewers may dismiss before digging. tighten framing and proof points.",
    Medium:
      "you'll get past the resume screen but expect interviewers to push hard on specifics. the work is real, the framing isn't.",
    Hard: "signals are shaky — expect skepticism and probing. bring receipts: metrics, scope, and decision ownership.",
    Cooked: "this reads as a risk hire on paper. you need a clean narrative rewrite before you burn meetings.",
  };
  return map[h] ?? map.Medium;
}

export function RoastDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeQuery = searchParams.get("resume");
  const openNotesTabFromUrl = searchParams.get("tab") === "notes";

  const { isSignedIn, isLoaded, getToken } = useAuth();

  const [resolving, setResolving] = useState(true);
  const [resolvedResumeId, setResolvedResumeId] = useState<string | null>(null);

  const [hydrating, setHydrating] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const [liveScore, setLiveScore] = useState<ScoreResponse | null>(null);
  const [liveFlags, setLiveFlags] = useState<FlagsResponse | null>(null);
  const [liveQuestions, setLiveQuestions] = useState<QuestionItem[]>([]);

  const [resultTab, setResultTab] = useState<ResultTabId>("score");
  const [myRoasts, setMyRoasts] = useState<MyRoastItem[]>([]);
  const [quizStarting, setQuizStarting] = useState(false);
  const [quizLength, setQuizLength] = useState<QuizLengthId>("medium");
  const [quizErr, setQuizErr] = useState<string | null>(null);
  const [quizScores, setQuizScores] = useState<StoredQuizScore[]>([]);
  const [notesRemountKey, setNotesRemountKey] = useState(0);

  const [countScore, setCountScore] = useState(0);
  const [scoreAnimDone, setScoreAnimDone] = useState(false);
  const [linerExpanded, setLinerExpanded] = useState(false);
  const countRaf = useRef<number | null>(null);

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    const t = await getToken();
    return t ?? undefined;
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!liveScore) {
      setQuizScores([]);
      return;
    }
    setQuizScores(parseInterviewQuizScores(liveScore.interview_quiz_scores));
  }, [liveScore]);

  useEffect(() => {
    if (resultTab !== "questions" || !resolvedResumeId || resolving || hydrating) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await bearer();
        const s = await getScore(resolvedResumeId, token ? { token } : undefined);
        if (!cancelled) {
          setLiveScore(s);
          setQuizScores(parseInterviewQuizScores(s.interview_quiz_scores));
        }
      } catch {
        /* keep existing */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resultTab, resolvedResumeId, resolving, hydrating, bearer]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSignedIn) {
        setMyRoasts([]);
        return;
      }
      const tok = await getToken();
      if (!tok || !alive) return;
      try {
        const items = await fetchMyRoasts(tok);
        if (alive) setMyRoasts(items);
      } catch {
        if (alive) setMyRoasts([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [getToken, isSignedIn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Before Clerk finishes loading, `isSignedIn` is false — do not treat that as
      // "signed out" or we clear to empty and skip `/me/roasts` (looks like data vanished).
      if (!isLoaded) {
        return;
      }

      setResolving(true);
      setHydrateError(null);

      const q = resumeQuery?.trim();
      if (q && isUuidShape(q)) {
        if (!cancelled) {
          setResolvedResumeId(q);
          setResolving(false);
        }
        return;
      }

      if (isSignedIn) {
        const tok = await getToken();
        if (tok && !cancelled) {
          try {
            const items = await fetchMyRoasts(tok);
            const pick = items.find((i) => i.analysis_status === "done") ?? items[0];
            if (pick) {
              router.replace(`/dashboard?resume=${pick.resume_id}`);
              if (!cancelled) {
                setResolvedResumeId(pick.resume_id);
                setResolving(false);
              }
              return;
            }
          } catch {
            /* fall through */
          }
        }
      }

      try {
        const ls =
          typeof window !== "undefined" ? window.localStorage.getItem(LAST_RESUME_LS)?.trim() : null;
        if (ls && isUuidShape(ls)) {
          router.replace(`/dashboard?resume=${ls}`);
          if (!cancelled) {
            setResolvedResumeId(ls);
            setResolving(false);
          }
          return;
        }
      } catch {
        /* */
      }

      if (!cancelled) {
        setResolvedResumeId(null);
        setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeQuery, isSignedIn, isLoaded, getToken, router]);

  useEffect(() => {
    if (resolving || !resolvedResumeId) return;

    let cancelled = false;
    setHydrating(true);
    setHydrateError(null);

    (async () => {
      try {
        const token = await bearer();
        const auth = token ? { token } : undefined;
        const [s, f, q] = await Promise.all([
          getScore(resolvedResumeId, auth),
          getFlags(resolvedResumeId, auth),
          getQuestions(resolvedResumeId, auth).catch(() => ({
            questions: [] as QuestionItem[],
            share_slug: "",
            degraded: false,
          })),
        ]);
        if (cancelled) return;
        setLiveScore(s);
        setLiveFlags(f);
        setLiveQuestions(Array.isArray(q.questions) ? q.questions : []);
        setResultTab("score");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load roast";
        if (!cancelled) {
          setHydrateError(msg);
          setLiveScore(null);
          setLiveFlags(null);
          setLiveQuestions([]);
        }
        try {
          window.localStorage.removeItem(LAST_RESUME_LS);
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedResumeId, resolving, bearer]);

  const rawFlags = (liveFlags?.flags ?? liveFlags?.red_flags) as unknown;
  const flags = Array.isArray(rawFlags) ? rawFlags.filter(isStructuredFlag) : [];

  const headline = liveScore?.one_liner ?? liveScore?.headline ?? null;

  const displayScore =
    liveScore?.cooked_score !== null && liveScore?.cooked_score !== undefined
      ? liveScore.cooked_score
      : null;

  const showResultTabs = Boolean(liveScore && displayScore !== null);

  const heatNorm = liveScore ? normalizeHeatLabel(liveScore.heat_label) : "Medium";
  const heatColor = scoreHeatColor(heatNorm);

  const currentRoast = useMemo(
    () => myRoasts.find((r) => r.resume_id === resolvedResumeId),
    [myRoasts, resolvedResumeId],
  );

  const fromResumeQuestions = useMemo(
    () => liveQuestions.filter((q) => (q.bucket ?? "from_resume") !== "gap"),
    [liveQuestions],
  );
  const gapQuestions = useMemo(() => liveQuestions.filter((q) => q.bucket === "gap"), [liveQuestions]);

  useEffect(() => {
    if (!openNotesTabFromUrl || !showResultTabs || !resolvedResumeId) return;
    setResultTab("notes");
    router.replace(`/dashboard?resume=${encodeURIComponent(resolvedResumeId)}`, { scroll: false });
  }, [openNotesTabFromUrl, showResultTabs, resolvedResumeId, router]);

  useEffect(() => {
    if (countRaf.current != null) {
      cancelAnimationFrame(countRaf.current);
      countRaf.current = null;
    }
    if (displayScore === null) {
      setCountScore(0);
      setScoreAnimDone(false);
      return;
    }
    const target = displayScore;
    setScoreAnimDone(false);
    setCountScore(0);
    const start = performance.now();
    const dur = 600;
    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setCountScore(Math.round(easeOut(t) * target));
      if (t < 1) {
        countRaf.current = requestAnimationFrame(tick);
      } else {
        countRaf.current = null;
        setCountScore(target);
        window.setTimeout(() => setScoreAnimDone(true), 100);
      }
    };
    countRaf.current = requestAnimationFrame(tick);
    return () => {
      if (countRaf.current != null) cancelAnimationFrame(countRaf.current);
      countRaf.current = null;
    };
  }, [displayScore, resolvedResumeId]);

  function openResume(id: string) {
    router.push(`/dashboard?resume=${id}`);
  }

  function startQuizFromRoast() {
    if (!resolvedResumeId || typeof window === "undefined") return;
    setQuizErr(null);
    const role =
      liveScore?.role?.trim() ||
      myRoasts.find((i) => i.resume_id === resolvedResumeId)?.target_role?.trim() ||
      "Software Engineer";
    const handoff: QuizStartHandoff = {
      resumeId: resolvedResumeId,
      role,
      hard_mode: false,
      question_count: quizCountForLength(quizLength),
    };
    try {
      window.localStorage.setItem(QUIZ_START_HANDOFF_KEY, JSON.stringify(handoff));
    } catch {
      setQuizErr("Could not start quiz — allow storage or try again.");
      return;
    }
    setQuizStarting(true);
    openQuizStartInNewTab(window.location.origin, (path) => router.push(path));
    window.setTimeout(() => setQuizStarting(false), 900);
  }

  function navCount(id: ResultTabId): number | null {
    if (id === "flags") return flags.length > 0 ? flags.length : null;
    if (id === "questions") return liveQuestions.length > 0 ? liveQuestions.length : null;
    return null;
  }

  function NavRow({ mobile }: { mobile?: boolean }) {
    return (
      <nav
        className={mobile ? "flex gap-1 overflow-x-auto pb-2 lg:hidden" : "hidden flex-col gap-0.5 lg:flex"}
        aria-label="Roast sections"
      >
        {NAV.map(({ id, label }) => {
          const active = resultTab === id;
          const c = navCount(id);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setResultTab(id)}
              className={`relative flex h-9 shrink-0 items-center rounded-sm pl-3 pr-2 text-left text-[13px] transition-colors duration-100 ease-out hover:text-lc-text ${
                active ? "text-lc-text" : "text-lc-muted"
              } ${mobile ? "min-w-[5.5rem] justify-center px-3" : "w-full"}`}
            >
              <span
                className={`pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 origin-left rounded-full bg-lc-orange transition-transform duration-150 ease-out ${
                  active ? "scale-x-100" : "scale-x-0"
                }`}
                aria-hidden
              />
              <span className="relative flex min-w-0 flex-1 items-center justify-between gap-2">
                <span>{label}</span>
                {c !== null ? (
                  <span className="shrink-0 tabular-nums text-[11px] text-lc-dim">{c}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  if (resolving || (hydrating && !hydrateError && !liveScore)) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-lc-border bg-lc-surface p-10">
        <p className="font-mono text-[13px] text-lc-muted">Loading dashboard…</p>
      </div>
    );
  }

  if (!resolvedResumeId && !resolving) {
    return (
      <div className="rounded-xl border border-lc-border bg-lc-surface p-8 text-center">
        <p className="text-[15px] text-lc-muted">
          No roast on file yet — upload a resume to get your score and tabs.
        </p>
        <Link
          href="/roast"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-lc-orange px-6 py-3 text-[14px] font-semibold text-black transition-transform duration-100 ease-out hover:-translate-y-px hover:bg-lc-orangeHover"
        >
          Go to upload
        </Link>
      </div>
    );
  }

  const resumeLine1 = `resume · ${formatResumeDate(currentRoast?.resume_created_at)}`;
  const resumeLine2 = currentRoast?.target_role?.trim() || liveScore?.role?.trim() || "—";

  const previewFlags = flags.slice(0, 2);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Mobile top */}
      <div className="border-b border-lc-divider px-4 py-3 lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="tabular-nums text-[28px] font-semibold leading-none" style={{ color: heatColor }}>
            {displayScore !== null ? countScore : "—"}
          </p>
          <p className="text-[13px] text-lc-muted">
            <span className="text-lc-dim">·</span> {heatNorm}
          </p>
        </div>
        <NavRow mobile />
      </div>

      {/* Desktop sidebar */}
      <aside
        className="animate-dashboard-sidebar-in hidden w-[220px] shrink-0 flex-col border-r border-lc-divider px-6 pb-4 pt-8 lg:flex"
        aria-label="Roast overview"
      >
        {displayScore !== null ? (
          <>
            <p
              className="tabular-nums text-[72px] font-semibold leading-[0.95] tracking-tight"
              style={{ color: heatColor }}
            >
              {countScore}
            </p>
            <p className="mt-1 text-[13px] text-lc-muted">
              / 100 <span className="text-lc-dim">·</span>{" "}
              <span className="font-medium" style={{ color: heatColor }}>
                {heatNorm}
              </span>
            </p>
            {headline ? (
              <button
                type="button"
                onClick={() => setLinerExpanded((e) => !e)}
                className={`mt-3 w-full text-left text-[12px] italic leading-snug text-lc-muted transition-opacity duration-200 ease-out ${
                  linerExpanded ? "" : "line-clamp-3"
                } ${scoreAnimDone ? "opacity-100" : "opacity-0"}`}
              >
                &ldquo;{headline}&rdquo;
              </button>
            ) : null}
          </>
        ) : (
          <p className="text-[13px] text-lc-muted">—</p>
        )}

        <hr className="my-4 border-0 border-t border-lc-divider" />

        <NavRow />

        <hr className="my-4 border-0 border-t border-lc-divider" />

        <p className="break-all font-mono text-[12px] text-lc-text">{resumeLine1}</p>
        <p className="mt-1 text-[11px] leading-snug text-lc-dim">{resumeLine2}</p>
        <Link
          href="/roast?new=1"
          className="mt-4 flex h-8 w-full items-center justify-center rounded-md border border-lc-border bg-transparent text-[12px] text-lc-muted transition-transform duration-100 ease-out hover:-translate-y-px hover:border-lc-orange/50 hover:text-lc-text"
        >
          upload new
        </Link>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">
        {isSignedIn && myRoasts.length > 0 ? (
          <details className="mx-4 mt-4 rounded-lg border border-lc-border bg-lc-surface/80 lg:mx-8 lg:mt-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer list-none px-4 py-3 font-mono text-[12px] uppercase tracking-wide text-lc-muted hover:text-lc-text">
              Your saves ({myRoasts.length})
            </summary>
            <ul className="max-h-48 divide-y divide-lc-divider overflow-y-auto border-t border-lc-border px-2 py-1">
              {myRoasts.map((row) => (
                <li key={row.resume_id} className="flex flex-wrap items-center gap-2 py-2 px-2">
                  <button
                    type="button"
                    disabled={row.analysis_status !== "done"}
                    onClick={() => openResume(row.resume_id)}
                    className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-lc-elevated disabled:cursor-not-allowed disabled:opacity-40 ${
                      row.resume_id === resolvedResumeId ? "bg-lc-elevated text-lc-orange" : "text-lc-text"
                    }`}
                  >
                    <span className="block truncate font-mono text-[11px] text-lc-dim">
                      resume · {formatResumeDate(row.resume_created_at)}
                    </span>
                    <span className="block truncate text-lc-muted">{row.target_role}</span>
                    {typeof row.cooked_score === "number" ? (
                      <span className="text-[11px] text-lc-orange">Score {row.cooked_score}</span>
                    ) : (
                      <span className="text-[11px] text-lc-dim capitalize">{row.analysis_status ?? "—"}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {hydrateError ? (
          <div className="mx-4 mt-4 rounded-lg border border-lc-hard/35 bg-lc-hard/10 p-4 text-[13px] text-lc-text lg:mx-8">
            <p>{hydrateError}</p>
            <Link href="/roast" className="mt-3 inline-block text-lc-orange hover:underline">
              Upload again
            </Link>
          </div>
        ) : null}

        {liveScore && displayScore === null && !hydrating ? (
          <div className="mx-4 mt-4 rounded-lg border border-lc-orange/25 bg-lc-orange/5 p-4 text-[13px] text-lc-muted lg:mx-8">
            Score unavailable for this analysis — try running another roast from{" "}
            <Link href="/roast?new=1" className="text-lc-orange hover:underline">
              upload
            </Link>
            .
          </div>
        ) : null}

        {showResultTabs && liveScore ? (
          <main
            className="animate-dashboard-main-in flex-1 overflow-y-auto px-4 pb-16 pt-4 lg:px-8 lg:pt-6"
            aria-label="Roast detail"
          >
            {resultTab !== "notes" ? (
            <div
              key={resultTab}
              className="animate-dashboard-panel-in mx-auto w-full max-w-[740px]"
              role="tabpanel"
            >
              {resultTab === "score" ? (
                <div className="space-y-8">
                  <div>
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="tabular-nums text-[42px] font-semibold leading-none sm:text-5xl" style={{ color: heatColor }}>
                        {countScore}
                      </span>
                      <span className="text-[15px] text-lc-muted sm:text-base">
                        / 100 <span className="text-lc-dim">·</span>{" "}
                        <span className="font-medium" style={{ color: heatColor }}>
                          {heatNorm}
                        </span>
                      </span>
                    </p>
                    {headline ? (
                      <button
                        type="button"
                        onClick={() => setLinerExpanded((e) => !e)}
                        className={`mt-3 max-w-xl text-left text-[14px] italic leading-relaxed text-lc-muted transition-opacity duration-200 ease-out ${
                          linerExpanded ? "" : "line-clamp-4"
                        } ${scoreAnimDone ? "opacity-100" : "opacity-0"}`}
                      >
                        &ldquo;{headline}&rdquo;
                      </button>
                    ) : null}
                    <p className="mt-6 font-mono text-[10px] uppercase tracking-wide text-lc-dim">{"// what this means"}</p>
                    <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-lc-muted">
                      {heatNorm} — {heatMeaningLine(liveScore.heat_label ?? "")}
                    </p>
                    {liveScore.degraded ? (
                      <p className="mt-3 text-[12px] text-lc-dim">Providers were flaky for this run — take the verdict with extra salt.</p>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-lc-dim">{"// share your score"}</p>
                    <div className="max-w-md">
                      <ScoreCard
                        cookedScore={displayScore ?? 0}
                        heatLabel={normalizeHeatLabel(liveScore.heat_label)}
                        headline={headline}
                        showFooter
                        showTargetRole={false}
                        degraded={liveScore.degraded}
                      />
                      {liveScore.share_slug ? (
                        <ScoreShareActions
                          className="mt-4"
                          score={displayScore ?? 0}
                          shareSlug={liveScore.share_slug}
                          heatLabel={liveScore.heat_label}
                          headline={headline}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <p className="mb-4 font-mono text-[10px] uppercase tracking-wide text-lc-dim">
                      {"// "}
                      {flags.length} things to fix
                    </p>
                    {flags.length > 0 ? (
                      <ul className="space-y-4">
                        {previewFlags.map((flag, idx) => (
                          <li
                            key={`${flag.issue}-${idx}`}
                            className="animate-flag-card-in rounded-lg border border-white/[0.03] bg-[#1d1d1d] p-4 text-[14px] leading-relaxed text-lc-text"
                            style={{ animationDelay: `${idx * 40}ms` }}
                          >
                            {flag.source_bullet ? (
                              <p className="mb-2 font-mono text-[12px] text-lc-dim">&ldquo;{flag.source_bullet}&rdquo;</p>
                            ) : null}
                            <p className="text-lc-muted">{flag.issue}</p>
                            <p className="mt-3 text-[12px] font-medium text-lc-orange">rewrite →</p>
                            <p className="mt-1 text-[13px] text-lc-text/90">&ldquo;{flag.suggested_rewrite}&rdquo;</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[14px] text-lc-muted">No flagged bullets for this run.</p>
                    )}
                    {flags.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => setResultTab("flags")}
                        className="mt-4 text-[13px] font-medium text-lc-orange transition-transform duration-100 ease-out hover:-translate-y-px hover:underline"
                      >
                        see all flags →
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {resultTab === "flags" ? (
                <div className="space-y-3">
                  {flags.length > 0 ? (
                    flags.map((flag, idx) => (
                      <article
                        key={`${flag.issue}-${idx}`}
                        className="animate-flag-card-in rounded-lg border border-white/[0.03] border-l-2 border-l-[#EF4444] bg-[#1d1d1d] p-5"
                        style={{ animationDelay: `${Math.min(idx, 4) * 40}ms` }}
                      >
                        {flag.source_bullet ? (
                          <p className="mb-3 font-mono text-[12px] leading-relaxed text-lc-dim">
                            &ldquo;{flag.source_bullet}&rdquo;
                          </p>
                        ) : null}
                        <p className="text-[14px] leading-relaxed text-lc-text">{flag.issue}</p>
                        <p className="mt-4 text-[12px] font-medium text-lc-orange">rewrite →</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-lc-text/95">&ldquo;{flag.suggested_rewrite}&rdquo;</p>
                      </article>
                    ))
                  ) : (
                    <p className="text-[14px] text-lc-muted">No flagged bullets for this run.</p>
                  )}
                </div>
              ) : null}

              {resultTab === "questions" ? (
                <div className="space-y-8">
                  {quizScores.length > 0 ? (
                    <div>
                      <QuizImprovementChart scores={quizScores} />
                    </div>
                  ) : null}

                  {fromResumeQuestions.length > 0 ? (
                    <section>
                      <p className="mb-6 font-mono text-[10px] uppercase tracking-wide text-lc-dim">{"// from your resume"}</p>
                      <ul className="space-y-6">
                        {fromResumeQuestions.map((q, i) => (
                          <li key={`fr-${i}`} className="text-[14px] leading-relaxed text-lc-text">
                            <p>
                              <span className="text-lc-orange">→</span>{" "}
                              <span className="text-lc-text">{q.question}</span>
                            </p>
                            {q.source_bullet ? (
                              <p className="mt-3 hidden pl-4 font-mono text-[11px] leading-relaxed text-lc-dim md:block md:pl-5">
                                &ldquo;{q.source_bullet}&rdquo;
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {fromResumeQuestions.length > 0 && gapQuestions.length > 0 ? (
                    <hr className="border-0 border-t border-lc-divider" />
                  ) : null}

                  {gapQuestions.length > 0 ? (
                    <section>
                      <p className="mb-6 font-mono text-[10px] uppercase tracking-wide text-lc-dim">
                        {"// they'll ask because it's missing"}
                      </p>
                      <ul className="space-y-6">
                        {gapQuestions.map((q, i) => (
                          <li key={`gap-${i}`} className="text-[14px] leading-relaxed text-lc-text">
                            <p>
                              <span className="text-lc-orange">→</span> <span>{q.question}</span>
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {liveQuestions.length === 0 ? (
                    <p className="text-[14px] text-lc-muted">No interview questions for this run.</p>
                  ) : null}

                  <div className="mt-8 space-y-4 border-t border-lc-divider pt-8">
                    {quizScores.length === 0 ? (
                      <>
                        <p className="font-mono text-[10px] uppercase tracking-wide text-lc-dim">
                          {"// haven't tried the quiz yet"}
                        </p>
                        <p className="text-[13px] text-lc-muted">answering these out loud is the point.</p>
                      </>
                    ) : null}
                    <QuizLengthPicker
                      className="mt-2"
                      value={quizLength}
                      onChange={setQuizLength}
                      disabled={quizStarting}
                    />
                    <button
                      type="button"
                      disabled={quizStarting}
                      onClick={() => void startQuizFromRoast()}
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-lc-orange text-[14px] font-semibold text-black transition-transform duration-100 ease-out hover:-translate-y-px hover:bg-lc-orangeHover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {quizStarting ? "Starting…" : "quiz me on this"}
                    </button>
                    {quizErr ? (
                      <p className="text-[12px] text-lc-hard" role="alert">
                        {quizErr}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

            </div>
            ) : null}

            {resolvedResumeId ? (
              <div
                className={
                  resultTab === "notes"
                    ? "animate-dashboard-panel-in mx-auto block w-full max-w-[820px]"
                    : "hidden"
                }
                role={resultTab === "notes" ? "tabpanel" : undefined}
                aria-hidden={resultTab !== "notes"}
              >
                <NotesStudyPage
                  key={`${resolvedResumeId}-${notesRemountKey}`}
                  resumeId={resolvedResumeId}
                  embedded
                  notesTabActive={resultTab === "notes"}
                  onNotesCreated={() => {
                    setNotesRemountKey((k) => k + 1);
                  }}
                />
              </div>
            ) : null}
          </main>
        ) : null}
      </div>
    </div>
  );
}
