"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
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

function sectionKindLabel(kind: string | undefined): string {
  const k = (kind ?? "").toLowerCase();
  if (k === "experience") return "Experience";
  if (k === "project") return "Project";
  if (k === "domain") return "Domain";
  if (k === "skills") return "Skills";
  if (k === "weak_area") return "Weak area";
  if (k === "research") return "Research";
  if (k === "certifications") return "Certifications";
  if (k === "other") return "Other";
  return "Note";
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
  /** Role from dashboard roast list / score — skips an extra getScore when set with skipScoreFetch. */
  initialRoleLabel?: string;
  /** When true and initialRoleLabel is set, notes load does not call getScore. */
  skipScoreFetch?: boolean;
};

export function NotesStudyPage({
  resumeId,
  onNotesCreated,
  embedded = false,
  notesTabActive = true,
  initialRoleLabel,
  skipScoreFetch = false,
}: NotesStudyPageProps) {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();

  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [notes, setNotes] = useState<NotesGetResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [roleLabel, setRoleLabel] = useState<string>(initialRoleLabel?.trim() || "your role");
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

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [panelEditing, setPanelEditing] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const panelEditorRef = useRef<NotesRichEditorHandle>(null);
  const panelEditingRef = useRef(false);

  useEffect(() => {
    panelEditingRef.current = panelEditing;
  }, [panelEditing]);

  const selectSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    setPanelEditing(false);
    setCurriculumOpen(false);
  }, []);

  const closeSectionPanel = useCallback(() => {
    if (panelEditingRef.current) {
      panelEditorRef.current?.commit();
    }
    setPanelEditing(false);
    setActiveSectionId(null);
  }, []);

  useEffect(() => {
    if (!embedded || !sortedSections.length) return;
    if (activeSectionId && sortedSections.some((s) => s.section_id === activeSectionId)) return;
    setActiveSectionId(sortedSections[0].section_id);
  }, [embedded, sortedSections, activeSectionId]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const onChange = () => setCurriculumOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!embedded || !curriculumOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded, curriculumOpen]);

  useEffect(() => {
    if (!notesTabActive) {
      if (embedded) {
        setPanelEditing(false);
      } else {
        closeSectionPanel();
      }
      return;
    }
    if (!highlightSectionId) return;
    selectSection(highlightSectionId);
  }, [notesTabActive, highlightSectionId, selectSection, closeSectionPanel, embedded]);

  useEffect(() => {
    if (embedded || !activeSectionId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded, activeSectionId]);

  useEffect(() => {
    if (embedded || !activeSectionId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSectionPanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embedded, activeSectionId, closeSectionPanel]);

  const activeSection = useMemo(
    () =>
      activeSectionId ? sortedSections.find((s) => s.section_id === activeSectionId) ?? null : null,
    [sortedSections, activeSectionId],
  );

  const activeDraft = activeSectionId
    ? (drafts[activeSectionId] ?? activeSection?.content ?? "")
    : "";

  const activeSectionIndex = useMemo(() => {
    if (!activeSectionId) return -1;
    return sortedSections.findIndex((s) => s.section_id === activeSectionId);
  }, [sortedSections, activeSectionId]);

  const mobileSectionLabel = useMemo(() => {
    if (!activeSection) return "Select a section";
    return activeSection.title;
  }, [activeSection]);

  const drawerDragControls = useDragControls();

  const onDrawerDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (info.offset.y > 72 || info.velocity.y > 420) {
        closeSectionPanel();
      }
    },
    [closeSectionPanel],
  );

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

        const skipScore = skipScoreFetch && Boolean(initialRoleLabel?.trim());

        if (hadCache && !postQuizPoll) {
          if (!skipScore) {
            const score = await getScore(resumeId, auth).catch(() => null);
            if (cancelled) return;
            const rl = score?.role?.trim();
            if (rl) {
              setRoleLabel(rl);
              writeNotesSessionCache(resumeId, cached!.notes, rl);
            }
          } else if (initialRoleLabel?.trim()) {
            setRoleLabel(initialRoleLabel.trim());
            writeNotesSessionCache(resumeId, cached!.notes, initialRoleLabel.trim());
          }
          return;
        }

        const [n, score] = await Promise.all([
          getNotes(resumeId, auth),
          skipScore
            ? Promise.resolve(null)
            : getScore(resumeId, auth).catch(() => null),
        ]);
        if (cancelled) return;
        const rl = score?.role?.trim() || initialRoleLabel?.trim() || "your role";
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
  }, [resumeId, bearer, applyNotesPayload, skipScoreFetch, initialRoleLabel]);

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

  const onPanelBlurCommitted = useCallback(
    (html: string) => {
      const sid = activeSectionId;
      if (!sid) return;
      onDraftChange(sid, html);
      void flushPatch(sid, html);
      setPanelEditing(false);
    },
    [activeSectionId, flushPatch],
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

  const renewDevBlock = isDev ? (
    <div className="mt-8 border-t border-lc-divider pt-6">
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
  ) : null;

  if (embedded) {
    const curriculumClass = curriculumOpen ? " plan-curriculum--drawer-open" : "";
    const shellClass = curriculumOpen ? " plan-coursera-shell--curriculum-open" : "";
    const hasPrev = activeSectionIndex > 0;
    const hasNext =
      activeSectionIndex >= 0 && activeSectionIndex < sortedSections.length - 1;

    return (
      <div className="notes-page notes-page--player">
        <div className="plan-execution-header">
          <h1 className="plan-execution-title">
            <span className="plan-execution-title-primary">Interview prep notes</span>
            <span className="plan-execution-title-sep" aria-hidden>
              {" "}
              ·{" "}
            </span>
            <span className="plan-execution-title-role">{roleLabel}</span>
          </h1>
          {pollUpdating ? (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-lc-muted"
              role="status"
            >
              <span className="inline-block animate-spin font-mono" aria-hidden>
                ↻
              </span>
              <span>updating notes…</span>
            </span>
          ) : null}
        </div>

        <div className={`plan-execution-wrap plan-coursera-shell${shellClass}`}>
          <div className="plan-coursera-split">
            {curriculumOpen ? (
              <button
                type="button"
                className="plan-curriculum-backdrop"
                aria-label="Close sections"
                onClick={() => setCurriculumOpen(false)}
              />
            ) : null}

            <aside
              className={`plan-curriculum${curriculumClass}`}
              aria-label="Resume note sections"
            >
              <div className="plan-curriculum-header">
                <p className="plan-field-label">Notes from your resume</p>
                <h2 className="plan-curriculum-title">{roleLabel}</h2>
              </div>
              <nav className="plan-curriculum-days" aria-label="Sections">
                <ul className="plan-curriculum-items">
                  {sortedSections.map((s) => {
                    const isActive = activeSectionId === s.section_id;
                    return (
                      <li key={s.section_id}>
                        <button
                          type="button"
                          className={`plan-curriculum-item${isActive ? " plan-curriculum-item--active" : ""}${
                            highlightSectionId === s.section_id ? " ring-1 ring-inset ring-lc-orange/35" : ""
                          }`}
                          onClick={() => selectSection(s.section_id)}
                        >
                          <span
                            className="plan-curriculum-icon plan-curriculum-icon--notes"
                            aria-hidden
                          >
                            N
                          </span>
                          <span className="plan-curriculum-item-title">{s.title}</span>
                          {s.weak_indicator ? (
                            <span className="plan-curriculum-weak-tag">weak</span>
                          ) : null}
                          {pulseSaveSectionId === s.section_id ? (
                            <span className="sr-only">Saved</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <div className="plan-lesson-main">
              <div className="plan-mobile-chrome">
                <button
                  type="button"
                  className="plan-mobile-chrome-btn"
                  aria-expanded={curriculumOpen}
                  onClick={() => setCurriculumOpen((open) => !open)}
                >
                  Sections
                </button>
                <span className="plan-mobile-chrome-title">{mobileSectionLabel}</span>
              </div>

              <div className="plan-lesson-panel">
                {activeSection ? (
                  <article className="plan-lesson-article">
                    <nav className="plan-lesson-breadcrumb" aria-label="Breadcrumb">
                      <span>{roleLabel}</span>
                      <span className="plan-lesson-breadcrumb-sep" aria-hidden>
                        ›
                      </span>
                      <span>{sectionKindLabel(activeSection.section_kind)}</span>
                      <span className="plan-lesson-breadcrumb-sep" aria-hidden>
                        ›
                      </span>
                      <span className="plan-lesson-breadcrumb-current">{activeSection.title}</span>
                    </nav>

                    <header className="plan-lesson-header">
                      <div className="notes-lesson-header-row">
                        <div className="min-w-0 flex-1">
                          <span className="plan-module-kind">
                            {sectionKindLabel(activeSection.section_kind)}
                          </span>
                          <h1 className="plan-lesson-title">{activeSection.title}</h1>
                        </div>
                        {panelEditing ? (
                          <button
                            type="button"
                            className="plan-secondary-btn"
                            onClick={() => panelEditorRef.current?.commit()}
                          >
                            Done
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="plan-secondary-btn"
                            onClick={() => setPanelEditing(true)}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </header>

                    <div className="plan-lesson-body">
                      {panelEditing ? (
                        <>
                          <NotesRichEditor
                            ref={panelEditorRef}
                            variant="drawer"
                            value={activeDraft}
                            onBlurCommitted={onPanelBlurCommitted}
                          />
                          <p className="notes-lesson-edit-hint">
                            {"// tap Done or leave the editor to save"}
                          </p>
                        </>
                      ) : (
                        <NotesSectionReadPanel content={activeDraft} />
                      )}
                    </div>

                    {renewDevBlock}
                  </article>
                ) : (
                  <p className="plan-day-modules-status">Select a section from the list.</p>
                )}

                {activeSection ? (
                  <footer className="plan-lesson-nav">
                    <button
                      type="button"
                      className="plan-secondary-btn plan-lesson-nav-btn"
                      disabled={!hasPrev}
                      onClick={() =>
                        selectSection(sortedSections[activeSectionIndex - 1].section_id)
                      }
                    >
                      Previous
                    </button>
                    <span className="plan-lesson-nav-pos">
                      {activeSectionIndex + 1} / {sortedSections.length}
                    </span>
                    <button
                      type="button"
                      className="plan-secondary-btn plan-lesson-nav-btn"
                      disabled={!hasNext}
                      onClick={() =>
                        selectSection(sortedSections[activeSectionIndex + 1].section_id)
                      }
                    >
                      Next
                    </button>
                  </footer>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-md:-mx-5 max-md:px-0">
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

      <div className="min-w-0 flex-1">
        <p className="sr-only" id="notes-sections-list-desc">
          Tap a section to open it in a sheet. Use Edit to change notes.
        </p>
        <ul className="flex flex-col gap-0" aria-describedby="notes-sections-list-desc">
          {sortedSections.map((s, idx) => {
            const tier = tierFromKind(s.section_kind);
            const borderCls = TIER_BORDER[tier];
            const isOpen = activeSectionId === s.section_id;
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
                  onClick={() => selectSection(s.section_id)}
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

        {renewDevBlock}
      </div>

      {portalReady && notesTabActive
        ? createPortal(
            <div className="landing-v3 landing-notes-drawer-root">
              <AnimatePresence>
              {activeSectionId && activeSection ? (
                <>
                  <motion.button
                    key={`${activeSectionId}-scrim`}
                    type="button"
                    aria-label="Close section"
                    className="landing-notes-drawer-scrim"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.26, ease: EASE_DEFAULT }}
                    onClick={closeSectionPanel}
                  />
                  <motion.div
                    key={`${activeSectionId}-sheet`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="notes-drawer-title"
                    className="landing-notes-drawer-sheet"
                    drag="y"
                    dragControls={drawerDragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0 }}
                    dragElastic={{ top: 0, bottom: 0.5 }}
                    onDragEnd={onDrawerDragEnd}
                    initial={{ y: "100%", x: "-50%" }}
                    animate={{ y: 0, x: "-50%" }}
                    exit={{ y: "100%", x: "-50%" }}
                    transition={{ duration: 0.42, ease: EASE_DEFAULT }}
                  >
                <div
                  className="landing-notes-drawer-handle-wrap"
                  aria-hidden
                  onPointerDown={(e) => drawerDragControls.start(e)}
                >
                  <div className="landing-notes-drawer-handle" />
                </div>
                <header className="landing-notes-drawer-header">
                  <button
                    type="button"
                    onClick={closeSectionPanel}
                    className="landing-notes-drawer-icon-btn"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="landing-notes-drawer-eyebrow">{"// section"}</p>
                    <h2 id="notes-drawer-title" className="landing-notes-drawer-title">
                      {activeSection.title}
                    </h2>
                  </div>
                  {panelEditing ? (
                    <button
                      type="button"
                      onClick={() => panelEditorRef.current?.commit()}
                      className="landing-notes-drawer-done"
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPanelEditing(true)}
                      className="landing-notes-drawer-edit"
                    >
                      Edit
                    </button>
                  )}
                </header>
                <div className="landing-notes-drawer-body">
                  {panelEditing ? (
                    <div>
                      <NotesRichEditor
                        ref={panelEditorRef}
                        variant="drawer"
                        value={activeDraft}
                        onBlurCommitted={onPanelBlurCommitted}
                      />
                      <p className="landing-notes-drawer-hint">
                        {"// tap Done or leave the editor to save"}
                      </p>
                    </div>
                  ) : (
                    <NotesSectionReadPanel content={activeDraft} />
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
