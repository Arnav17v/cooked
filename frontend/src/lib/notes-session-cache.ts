import type { NotesGetResponse } from "@/lib/api";

const PREFIX = "cooked_notes_session_v1_";

type NotesCacheEntry = {
  notes: NotesGetResponse;
  roleLabel?: string;
  savedAt: number;
};

function cacheKey(resumeId: string): string {
  return `${PREFIX}${resumeId}`;
}

export function readNotesSessionCache(resumeId: string): NotesCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(resumeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NotesCacheEntry;
    if (!parsed?.notes?.notes_id || !Array.isArray(parsed.notes.sections)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeNotesSessionCache(
  resumeId: string,
  notes: NotesGetResponse,
  roleLabel?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const entry: NotesCacheEntry = {
      notes,
      roleLabel: roleLabel?.trim() || undefined,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(cacheKey(resumeId), JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

export function clearNotesSessionCache(resumeId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(cacheKey(resumeId));
  } catch {
    /* */
  }
}
