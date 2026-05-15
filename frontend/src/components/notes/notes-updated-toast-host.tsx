"use client";

import { useCallback, useEffect, useState } from "react";

import { NOTES_UPDATED_TOAST_EVENT, showNotesUpdatedToast } from "@/lib/notes-updated-toast";

const AUTO_DISMISS_MS = 4500;

/**
 * Top-right toast for prep-note updates (weak flags). Listens for the same event
 * `showNotesUpdatedToast` dispatches so any client code can trigger it.
 */
export function NotesUpdatedToastHost() {
  const [open, setOpen] = useState(false);

  const onEvent = useCallback(() => {
    setOpen(true);
    window.setTimeout(() => setOpen(false), AUTO_DISMISS_MS);
  }, []);

  useEffect(() => {
    window.addEventListener(NOTES_UPDATED_TOAST_EVENT, onEvent);
    return () => window.removeEventListener(NOTES_UPDATED_TOAST_EVENT, onEvent);
  }, [onEvent]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[100] max-w-[min(100vw-2rem,20rem)] animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="pointer-events-auto rounded-lg border border-lc-border bg-lc-surface px-4 py-3 shadow-lg shadow-black/40">
        <p className="font-mono text-[11px] uppercase tracking-wide text-lc-dim">Notes</p>
        <p className="mt-1 text-[14px] font-medium text-lc-text">Notes updated</p>
        <p className="mt-0.5 text-[12px] text-lc-muted">New weak sections are marked in your prep notes.</p>
      </div>
    </div>
  );
}

/** Dev-only: expose on window for quick manual tests from the console. */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as { __cookedShowNotesToast?: () => void }).__cookedShowNotesToast =
    showNotesUpdatedToast;
}
