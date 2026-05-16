"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";

import { QuizLengthPicker } from "@/components/interview/quiz-length-picker";
import { LONG_RUN_TIME_HINT } from "@/components/ui/pipeline-progress";
import { isDevMode } from "@/lib/dev";
import { quizCountForLength, type QuizLengthId } from "@/lib/quiz-length";
import { EASE_DEFAULT } from "@/lib/motion-easing";
import {
  clearNotesSessionCache,
  readNotesSessionCache,
  writeNotesSessionCache,
} from "@/lib/notes-session-cache";

import {
  generateNotes,
  getNotes,
  getScore,
  NotesAlreadyExistError,
  patchNotesSection,
  renewNotes,
  type NotesGetResponse,
} from "@/lib/api";
import { QUIZ_START_HANDOFF_KEY, type QuizStartHandoff } from "@/lib/interview-quiz-start-handoff";
import { openQuizStartInNewTab } from "@/lib/open-quiz-start-tab";
import { showNotesUpdatedToast } from "@/lib/notes-updated-toast";
import {
  contentLooksLikeNotesHtml,
  NotesRichEditor,
  type NotesRichEditorHandle,
  NotesRichHtmlDisplay,
} from "@/components/notes/notes-rich-editor";

const QUIZ_HIGHLIGHT_LS = "cooked_notes_quiz_highlight_v1";
const POST_QUIZ_SS_PREFIX = "notes_post_quiz_";

const GENERATE_STATUS_CYCLE = [
  "analyzing resume…",
  "finding weak areas…",
  "writing talking points…",
] as const;

function postQuizKey(resumeId: string): string {
  return `${POST_QUIZ_SS_PREFIX}${resumeId}`;
}

function noteWeakIds(n: NotesGetResponse): Set<string> {
  return new Set(n.sections.filter((s) => s.weak_indicator).map((s) => s.section_id));
}

function notifyIfNewWeakSections(
  lastWeakRef: MutableRefObject<Set<string> | null>,
  n: NotesGetResponse,
): void {
  const now = noteWeakIds(n);
  const prev = lastWeakRef.current;
  lastWeakRef.current = now;
  if (prev === null) return;
  for (const id of now) {
    if (!prev.has(id)) {
      showNotesUpdatedToast();
      return;
    }
  }
}

/** Map stored `section_kind` to tier accent (legacy kinds → project). */
function tierFromKind(kind: string | undefined): "project" | "domain" | "weak_area" | "research" {
  const k = (kind ?? "").toLowerCase();
  if (k === "domain") return "domain";
  if (k === "weak_area") return "weak_area";
  if (k === "research") return "research";
  if (k === "project") return "project";
  return "project";
}

const TIER_BORDER: Record<ReturnType<typeof tierFromKind>, string> = {
  project: "border-l-lc-notesProject",
  domain: "border-l-lc-notesDomain",
  weak_area: "border-l-lc-notesWeak",
  research: "border-l-lc-notesResearch",
};

const CLOSING_HEADER_RE = /^(\s*)(LEAD WITH|IF PUSHED|NUMBERS|DON'T)\s*$/;

const PREFIX_RE =
  /^(\s*)(key point:\s*|reminder:\s*|metric to have ready:\s*|if they push:\s*|lead with:\s*|probe likely on:\s*|term:\s*)(.*)$/i;

function PlainLineWithMarks({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|==[^=\n]+==)/g);
  return (
    <>
      {parts.map((part, i) => {
        const mBold = part.match(/^\*\*([^*]+)\*\*$/);
        if (mBold) {
          return (
            <strong key={i} className="font-semibold text-lc-text">
              {mBold[1]}
            </strong>
          );
        }
        const mMark = part.match(/^==([^=]+)==$/);
        if (mMark) {
          return (
            <mark key={i} className="rounded-sm bg-lc-orange/25 px-0.5 text-lc-text">
              {mMark[1]}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function ifPushedArrowLineIndices(lines: string[]): Set<number> {
  const out = new Set<number>();
  let inPushed = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "IF PUSHED") {
      inPushed = true;
      continue;
    }
    if (t === "NUMBERS" || t === "DON'T") {
      inPushed = false;
      continue;
    }
    if (inPushed && t !== "") out.add(i);
  }
  return out;
}

function renderLineWithPrefixes(line: string) {
  const closing = line.match(CLOSING_HEADER_RE);
  if (closing) {
    const [, lead, label] = closing;
    return (
      <>
        {lead}
        <span className="mb-1 mt-2 block font-mono text-[10px] font-semibold uppercase tracking-wider text-lc-dim">
          {label}
        </span>
      </>
    );
  }
  const m = line.match(PREFIX_RE);
  if (m) {
    const [, lead, label, rest] = m;
    return (
      <>
        {lead}
        <strong className="font-semibold text-lc-text">{label}</strong>
        <span className="text-lc-text">
          <PlainLineWithMarks text={rest} />
        </span>
      </>
    );
  }
  return (
    <span className="text-lc-text">
      <PlainLineWithMarks text={line} />
    </span>
  );
}

function splitLines(content: string): string[] {
  if (!content) return [""];
  return content.split(/\r?\n/);
}

function NotesReadBody({ content, arrowLines }: { content: string; arrowLines: Set<number> }) {
  const lines = splitLines(content);
  return (
    <div className="space-y-0 text-[14px] leading-relaxed text-lc-text">
      {lines.map((line, i) => {
        if (line === "") {
          return <div key={`e-${i}`} className="h-2" aria-hidden />;
        }
        const h2m = line.match(/^##\s+(.+)$/);
        if (h2m) {
          return (
            <h2
              key={`h2-${i}`}
              className="mb-2 mt-4 text-lg font-semibold tracking-tight text-lc-text first:mt-0"
            >
              <PlainLineWithMarks text={h2m[1].trim()} />
            </h2>
          );
        }
        const h3m = line.match(/^###\s+(.+)$/);
        if (h3m) {
          return (
            <h3 key={`h3-${i}`} className="mb-1.5 mt-3 text-base font-semibold text-lc-text">
              <PlainLineWithMarks text={h3m[1].trim()} />
            </h3>
          );
        }
        const showArrow = arrowLines.has(i);
        return (
          <div key={`l-${i}`} className={showArrow ? "grid grid-cols-[1.125rem_1fr] gap-x-1.5" : "grid grid-cols-1"}>
            {showArrow ? (
              <span className="select-none pt-px font-sans text-lc-orange" aria-hidden>
                →
              </span>
            ) : null}
            <div className="min-w-0 font-sans">{renderLineWithPrefixes(line)}</div>
          </div>
        );
      })}
    </div>
  );
}

function NotesSectionReadPanel({ content }: { content: string }) {
  const richStored = useMemo(() => contentLooksLikeNotesHtml(content), [content]);
  const arrowLines = useMemo(() => {
    if (richStored) return new Set<number>();
    return ifPushedArrowLineIndices(splitLines(content));
  }, [content, richStored]);
  if (richStored) {
    return <NotesRichHtmlDisplay html={content} />;
  }
  return <NotesReadBody content={content} arrowLines={arrowLines} />;
}

export type NotesStudyPageProps = {
  resumeId: string;
  onNotesCreated?: () => void;
  /** When true, layout omits page chrome and quiz CTA (e.g. dashboard embed). */
  embedded?: boolean;
  /** When false (dashboard on another tab), close/hide the section drawer. Default true. */
  notesTabActive?: boolean;
};

export function NotesStudyPage({
  resumeId,
  onNotesCreated,
  embedded = false,
  notesTabActive = true,
}: NotesStudyPageProps) {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();

  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [notes, setNotes] = useState<NotesGetResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [roleLabel, setRoleLabel] = useState<string>("your role");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const baselineRef = useRef<string | null>(null);
  const weakSnapshotRef = useRef<Set<string> | null>(null);
  const [pollUpdating, setPollUpdating] = useState(false);
  const [highlightSectionId, setHighlightSectionId] = useState<string | null>(null);
  const [flashBorderIds, setFlashBorderIds] = useState<Set<string>>(() => new Set());
  const [pulseSaveSectionId, setPulseSaveSectionId] = useState<string | null>(null);
  const [notesCardEntryAnim, setNotesCardEntryAnim] = useState(true);

  const [emptyGenerating, setEmptyGenerating] = useState(false);
  const [generateErr, setGenerateErr] = useState<string | null>(null);
  const [generateStatusIdx, setGenerateStatusIdx] = useState(0);
  const [renewErr, setRenewErr] = useState<string | null>(null);
  const [renewBusy, setRenewBusy] = useState(false);
  const [quizLength, setQuizLength] = useState<QuizLengthId>("medium");

  const notesRef = useRef<NotesGetResponse | null>(null);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    if (!notes?.notes_id) {
      setNotesCardEntryAnim(false);
      return;
    }
    setNotesCardEntryAnim(true);
    const id = window.setTimeout(() => setNotesCardEntryAnim(false), 500);
    return () => window.clearTimeout(id);
  }, [notes?.notes_id]);

  const isDev = isDevMode();

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    const t = await getToken();
    return t ?? undefined;
  }, [getToken, isSignedIn]);

  const sortedSections = useMemo(() => {
    if (!notes?.sections?.length) return [];
    return [...notes.sections].sort((a, b) => a.display_order - b.display_order);
  }, [notes]);

  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    setPortalReady(true);
  }, []);

  const [drawerSectionId, setDrawerSectionId] = useState<string | null>(null);
  const [drawerEditing, setDrawerEditing] = useState(false);
  const drawerEditorRef = useRef<NotesRichEditorHandle>(null);
  const drawerEditingRef = useRef(false);

  useEffect(() => {
    drawerEditingRef.current = drawerEditing;
  }, [drawerEditing]);

  const openDrawer = useCallback((sectionId: string) => {
    setDrawerSectionId(sectionId);
    setDrawerEditing(false);
  }, []);

  const closeDrawer = useCallback(() => {
    if (drawerEditingRef.current) {
      drawerEditorRef.current?.commit();
    }
    setDrawerEditing(false);
    setDrawerSectionId(null);
  }, []);

  useEffect(() => {
    if (!notesTabActive) {
      closeDrawer();
      return;
    }
    if (!highlightSectionId) return;
    openDrawer(highlightSectionId);
  }, [notesTabActive, highlightSectionId, openDrawer, closeDrawer]);

  useEffect(() => {
    if (!drawerSectionId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerSectionId]);

  useEffect(() => {
    if (!drawerSectionId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerSectionId, closeDrawer]);

  const drawerSection = useMemo(
    () => (drawerSectionId ? sortedSections.find((s) => s.section_id === drawerSectionId) ?? null : null),
    [sortedSections, drawerSectionId],
  );

  const drawerDraft = drawerSectionId ? (drafts[drawerSectionId] ?? drawerSection?.content ?? "") : "";

  const readHighlightFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(QUIZ_HIGHLIGHT_LS);
      if (!raw) {
        setHighlightSectionId(null);
        return;
      }
      const o = JSON.parse(raw) as {
        resumeId?: string;
        sectionId?: string | null;
        sectionTag?: string | null;
      };
      if (o?.resumeId === resumeId) {
        let sid: string | null = o.sectionId && typeof o.sectionId === "string" ? o.sectionId : null;
        if (!sid && o.sectionTag && notes?.sections?.length) {
          const tag = String(o.sectionTag).trim().toLowerCase();
          const hit = notes.sections.find((s) => (s.section_tag ?? "").trim().toLowerCase() === tag);
          sid = hit?.section_id ?? null;
        }
        setHighlightSectionId(sid);
      } else {
        setHighlightSectionId(null);
      }
    } catch {
      setHighlightSectionId(null);
    }
  }, [resumeId, notes]);

  useEffect(() => {
    readHighlightFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === QUIZ_HIGHLIGHT_LS) readHighlightFromStorage();
    };
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(() => readHighlightFromStorage(), 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, [readHighlightFromStorage, notes]);

  const applyNotesPayload = useCallback(
    (
      n: NotesGetResponse,
      opts?: { compareForFlash?: NotesGetResponse | null; roleLabel?: string },
    ) => {
      const prev = opts?.compareForFlash;
      if (prev) {
        const changed = new Set<string>();
        const prevMap = new Map(prev.sections.map((s) => [s.section_id, s]));
        for (const s of n.sections) {
          const p = prevMap.get(s.section_id);
          if (p && (p.content !== s.content || p.weak_indicator !== s.weak_indicator)) {
            changed.add(s.section_id);
          }
        }
        if (changed.size) {
          setFlashBorderIds(changed);
          window.setTimeout(() => setFlashBorderIds(new Set()), 550);
        }
      }
      setNotes(n);
      const nd: Record<string, string> = {};
      for (const s of n.sections) nd[s.section_id] = s.content;
      setDrafts(nd);
      writeNotesSessionCache(resumeId, n, opts?.roleLabel);
    },
    [resumeId],
  );

  useEffect(() => {
    let cancelled = false;

    let postQuizPoll = false;
    try {
      const raw = sessionStorage.getItem(postQuizKey(resumeId));
      if (raw) {
        const o = JSON.parse(raw) as {
          baseline?: string | null;
          t?: number;
          weak_ids_before?: unknown;
        };
        const age = typeof o.t === "number" ? Date.now() - o.t : 0;
        if (age > 180_000) {
          sessionStorage.removeItem(postQuizKey(resumeId));
        } else {
          postQuizPoll = true;
          if (typeof o.baseline === "string") baselineRef.current = o.baseline;
          if (Array.isArray(o.weak_ids_before)) {
            const ids = o.weak_ids_before.filter(
              (x): x is string => typeof x === "string" && x.length > 0,
            );
            weakSnapshotRef.current = new Set(ids);
          }
        }
      }
    } catch {
      /* */
    }

    const cached = readNotesSessionCache(resumeId);
    const hadCache = cached !== null;
    if (cached) {
      applyNotesPayload(cached.notes, { roleLabel: cached.roleLabel });
      if (cached.roleLabel) setRoleLabel(cached.roleLabel);
      setInitialLoading(false);
    } else {
      weakSnapshotRef.current = null;
      setInitialLoading(true);
    }

    if (postQuizPoll) setPollUpdating(true);

    (async () => {
      setLoadErr(null);
      try {
        const token = await bearer();
        const auth = token ? { token } : undefined;

        if (hadCache && !postQuizPoll) {
          const score = await getScore(resumeId, auth).catch(() => null);
          if (cancelled) return;
          const rl = score?.role?.trim();
          if (rl) {
            setRoleLabel(rl);
            writeNotesSessionCache(resumeId, cached!.notes, rl);
          }
          return;
        }

        const [n, score] = await Promise.all([
          getNotes(resumeId, auth),
          getScore(resumeId, auth).catch(() => null),
        ]);
        if (cancelled) return;
        const rl = score?.role?.trim() || "your role";
        setRoleLabel(rl);

        if (!n) {
          clearNotesSessionCache(resumeId);
          setNotes(null);
          setInitialLoading(false);
          return;
        }

        let compareBaseline: string | null = n.updated_at ?? null;
        if (postQuizPoll) {
          compareBaseline = baselineRef.current ?? compareBaseline;
          baselineRef.current = compareBaseline;
        }

        const serverNewer =
          !hadCache ||
          postQuizPoll ||
          (n.updated_at ?? "") !== (cached?.notes.updated_at ?? "");

        if (serverNewer) {
          applyNotesPayload(n, {
            compareForFlash: hadCache ? notesRef.current : undefined,
            roleLabel: rl,
          });
          notifyIfNewWeakSections(weakSnapshotRef, n);
        } else if (!hadCache) {
          applyNotesPayload(n, { roleLabel: rl });
          notifyIfNewWeakSections(weakSnapshotRef, n);
        }
      } catch (e) {
        if (!cancelled && !hadCache) {
          setLoadErr(e instanceof Error ? e.message : "Could not load notes");
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeId, bearer, applyNotesPayload]);

  useEffect(() => {
    if (!pollUpdating || !notesRef.current) return;
    const baseline = baselineRef.current;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const token = await bearer();
          const n = await getNotes(resumeId, token ? { token } : undefined);
          if (!n) return;
          const a = n.updated_at ?? "__none__";
          const b = baseline ?? "__none__";
          if (a !== b) {
            const before = notesRef.current;
            notifyIfNewWeakSections(weakSnapshotRef, n);
            baselineRef.current = n.updated_at ?? null;
            setPollUpdating(false);
            applyNotesPayload(n, { compareForFlash: before, roleLabel });
            try {
              sessionStorage.removeItem(postQuizKey(resumeId));
            } catch {
              /* */
            }
          }
        } catch {
          /* */
        }
      })();
    }, 3000);
    return () => window.clearInterval(id);
  }, [pollUpdating, resumeId, bearer, applyNotesPayload, roleLabel]);

  useEffect(() => {
    if (!emptyGenerating) return;
    const id = window.setInterval(() => {
      setGenerateStatusIdx((i) => (i + 1) % GENERATE_STATUS_CYCLE.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [emptyGenerating]);

  const flushPatch = useCallback(
    async (sectionId: string, content: string) => {
      try {
        const token = await bearer();
        await patchNotesSection(sectionId, content, token ? { token } : undefined);
        setPulseSaveSectionId(sectionId);
        window.setTimeout(() => {
          setPulseSaveSectionId((s) => (s === sectionId ? null : s));
        }, 320);
      } catch {
        /* non-blocking */
      }
    },
    [bearer],
  );

  const onDraftChange = (sectionId: string, value: string) => {
    setDrafts((d) => ({ ...d, [sectionId]: value }));
  };

  const onDrawerBlurCommitted = useCallback(
    (html: string) => {
      const sid = drawerSectionId;
      if (!sid) return;
      onDraftChange(sid, html);
      void flushPatch(sid, html);
      setDrawerEditing(false);
    },
    [drawerSectionId, flushPatch],
  );

  async function onCreateNotes() {
    setGenerateErr(null);
    setEmptyGenerating(true);
    setGenerateStatusIdx(0);
    try {
      const token = await bearer();
      const auth = token ? { token } : undefined;
      const n = await generateNotes(resumeId, auth);
      applyNotesPayload(n, { roleLabel });
      onNotesCreated?.();
    } catch (e) {
      if (e instanceof NotesAlreadyExistError) {
        const token = await bearer();
        const auth = token ? { token } : undefined;
        const n = await getNotes(resumeId, auth);
        if (n) {
          applyNotesPayload(n);
          onNotesCreated?.();
        }
      } else {
        setGenerateErr(e instanceof Error ? e.message : "Could not create notes");
      }
    } finally {
      setEmptyGenerating(false);
    }
  }

  async function onRenewDev() {
    if (!isDev) return;
    setRenewErr(null);
    setRenewBusy(true);
    try {
      const token = await bearer();
      const auth = token ? { token } : undefined;
      clearNotesSessionCache(resumeId);
      const n = await renewNotes(resumeId, auth);
      applyNotesPayload(n, { roleLabel });
    } catch (e) {
      setRenewErr(e instanceof Error ? e.message : "Could not renew notes");
    } finally {
      setRenewBusy(false);
    }
  }

  function startQuizFromNotes() {
    if (typeof window === "undefined") return;
    const role = roleLabel.trim() || "Software Engineer";
    const handoff: QuizStartHandoff = {
      resumeId,
      role,
      hard_mode: false,
      question_count: quizCountForLength(quizLength),
    };
    try {
      window.localStorage.setItem(QUIZ_START_HANDOFF_KEY, JSON.stringify(handoff));
    } catch {
      return;
    }
    openQuizStartInNewTab(window.location.origin, (path) => router.push(path));
  }

  if (loadErr && !notes && !initialLoading) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-[14px] text-lc-muted">{loadErr}</p>
        <Link href="/dashboard" className="mt-8 inline-block text-lc-orange hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center py-16">
        <p className="text-[14px] text-lc-muted">Loading notes…</p>
      </div>
    );
  }

  if (!notes && emptyGenerating) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center max-md:px-0">
        <p className="font-mono text-[11px] uppercase tracking-wide text-lc-dim">{"// generating notes..."}</p>
        <div className="mt-8 h-2 w-full max-w-sm overflow-hidden rounded-full bg-lc-elevated">
          <div className="h-full w-[45%] rounded-full bg-lc-orange animate-notes-gen-bar" />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-lc-muted">{LONG_RUN_TIME_HINT}</p>
        <p className="mt-4 text-[13px] text-lc-muted">{GENERATE_STATUS_CYCLE[generateStatusIdx]}</p>
      </div>
    );
  }

  if (!notes) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center max-md:px-0">
        <p className="font-mono text-[11px] uppercase tracking-wide text-lc-dim">{"// no notes yet"}</p>
        {generateErr ? (
          <p className="mt-3 text-[12px] text-lc-hard" role="alert">
            {generateErr}
          </p>
        ) : null}
        <p className="mt-6 text-[12px] leading-relaxed text-lc-muted">{LONG_RUN_TIME_HINT}</p>
        <button
          type="button"
          disabled={emptyGenerating}
          onClick={() => void onCreateNotes()}
          className="mt-4 inline-flex h-11 min-w-[11rem] items-center justify-center rounded-lg bg-lc-orange px-6 text-[13px] font-semibold text-black transition-transform duration-100 ease-out hover:-translate-y-px hover:bg-lc-orangeHover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {emptyGenerating ? "generating…" : "create notes"}
        </button>
      </div>
    );
  }

  return (
    <div className={embedded ? "w-full" : "w-full max-md:-mx-5 max-md:px-0"}>
      {embedded ? (
        pollUpdating ? (
          <div className="mb-4 space-y-2">
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-lc-muted">
              <span className="inline-block animate-spin font-mono" aria-hidden>
                ↻
              </span>
              <span>updating notes…</span>
            </span>
            <p className="text-[12px] text-lc-dim">{LONG_RUN_TIME_HINT}</p>
          </div>
        ) : null
      ) : (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-lc-divider pb-4">
          <p className="min-w-0 text-[13px] text-lc-text">
            <span className="font-mono text-lc-dim">{"// interview prep notes"}</span>
            <span className="text-lc-muted"> · </span>
            <span>{roleLabel}</span>
          </p>
          {pollUpdating ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-lc-muted">
              <span className="inline-block animate-spin font-mono" aria-hidden>
                ↻
              </span>
              <span>updating notes…</span>
            </span>
          ) : null}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="sr-only" id="notes-sections-list-desc">
          Tap a section to open it in a sheet. Use Edit to change notes.
        </p>
        <ul className="flex flex-col gap-0" aria-describedby="notes-sections-list-desc">
          {sortedSections.map((s, idx) => {
            const tier = tierFromKind(s.section_kind);
            const borderCls = TIER_BORDER[tier];
            const isOpen = drawerSectionId === s.section_id;
            const entryDelay = notesCardEntryAnim ? Math.min(idx, 4) * 0.045 : 0;
            return (
              <motion.li
                key={s.section_id}
                className="list-none"
                initial={notesCardEntryAnim ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  ease: EASE_DEFAULT,
                  delay: notesCardEntryAnim ? entryDelay : 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => openDrawer(s.section_id)}
                  className={`relative flex w-full items-center gap-3 border-l-4 ${borderCls} bg-lc-surface/40 py-3.5 pl-4 pr-3 text-left transition-colors duration-100 ease-out hover:bg-lc-elevated/35 ${
                    highlightSectionId === s.section_id ? "ring-1 ring-lc-orange/35 ring-inset" : ""
                  } ${flashBorderIds.has(s.section_id) ? "shadow-[inset_4px_0_0_rgba(255,255,255,0.22)]" : ""}`}
                >
                  {pulseSaveSectionId === s.section_id ? (
                    <span
                      className="pointer-events-none absolute bottom-2 left-0 top-2 w-1 rounded-sm bg-lc-orange animate-notes-border-pulse"
                      aria-hidden
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 text-[15px] font-medium tracking-tight text-lc-text">{s.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {s.weak_indicator ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-lc-notesWeak">weak</span>
                    ) : null}
                    <ChevronRight
                      className={`h-5 w-5 shrink-0 text-lc-dim transition-transform duration-150 ease-out ${
                        isOpen ? "translate-x-0.5 text-lc-orange" : ""
                      }`}
                      aria-hidden
                    />
                  </span>
                </button>
                {idx < sortedSections.length - 1 ? (
                  <div className="h-px bg-lc-divider" role="separator" aria-hidden />
                ) : null}
              </motion.li>
            );
          })}
        </ul>

        {!embedded ? (
          <div className="mt-10 border-t border-lc-divider pt-8">
            <QuizLengthPicker value={quizLength} onChange={setQuizLength} />
            <button
              type="button"
              onClick={() => startQuizFromNotes()}
              className="mt-4 inline-flex h-10 items-center rounded-lg border border-lc-orange/50 bg-lc-orange/10 px-5 text-[13px] font-semibold text-lc-orange transition-transform duration-100 ease-out hover:-translate-y-px hover:bg-lc-orange/20"
            >
              quiz me on this
            </button>
          </div>
        ) : null}

        {isDev ? (
          <div className="mt-6 border-t border-lc-divider pt-6">
            <button
              type="button"
              disabled={renewBusy}
              onClick={() => void onRenewDev()}
              className="inline-flex h-9 items-center rounded-lg border border-lc-border bg-lc-elevated px-4 text-[12px] font-medium text-lc-muted transition-transform duration-100 ease-out hover:-translate-y-px hover:border-lc-orange/40 hover:text-lc-text disabled:opacity-50"
            >
              {renewBusy ? "Working…" : "Renew notes (dev)"}
            </button>
            {renewErr ? (
              <p className="mt-2 text-[12px] text-lc-hard" role="alert">
                {renewErr}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {portalReady && notesTabActive
        ? createPortal(
            <div className="landing-v3 landing-notes-drawer-root">
              <AnimatePresence>
              {drawerSectionId && drawerSection ? (
                <>
                  <motion.button
                    key={`${drawerSectionId}-scrim`}
                    type="button"
                    aria-label="Close section"
                    className="landing-notes-drawer-scrim"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.26, ease: EASE_DEFAULT }}
                    onClick={closeDrawer}
                  />
                  <motion.div
                    key={`${drawerSectionId}-sheet`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="notes-drawer-title"
                    className="landing-notes-drawer-sheet"
                    initial={{ y: "100%", x: "-50%" }}
                    animate={{ y: 0, x: "-50%" }}
                    exit={{ y: "100%", x: "-50%" }}
                    transition={{ duration: 0.42, ease: EASE_DEFAULT }}
                  >
                <div className="landing-notes-drawer-handle-wrap" aria-hidden>
                  <div className="landing-notes-drawer-handle" />
                </div>
                <header className="landing-notes-drawer-header">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="landing-notes-drawer-icon-btn"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="landing-notes-drawer-eyebrow">{"// section"}</p>
                    <h2 id="notes-drawer-title" className="landing-notes-drawer-title">
                      {drawerSection.title}
                    </h2>
                  </div>
                  {drawerEditing ? (
                    <button
                      type="button"
                      onClick={() => drawerEditorRef.current?.commit()}
                      className="landing-notes-drawer-done"
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDrawerEditing(true)}
                      className="landing-notes-drawer-edit"
                    >
                      Edit
                    </button>
                  )}
                </header>
                <div className="landing-notes-drawer-body">
                  {drawerEditing ? (
                    <div>
                      <NotesRichEditor
                        ref={drawerEditorRef}
                        variant="drawer"
                        value={drawerDraft}
                        onBlurCommitted={onDrawerBlurCommitted}
                      />
                      <p className="landing-notes-drawer-hint">
                        {"// tap Done or leave the editor to save"}
                      </p>
                    </div>
                  ) : (
                    <NotesSectionReadPanel content={drawerDraft} />
                  )}
                </div>
                  </motion.div>
                </>
              ) : null}
              </AnimatePresence>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
