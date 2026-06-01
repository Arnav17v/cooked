"use client";

import { MoreVertical } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  pushEnabled: boolean;
  pushBusy: boolean;
  onTogglePush: () => void;
  onDelete: () => void;
};

export function PlanToolbarMenu({ pushEnabled, pushBusy, onTogglePush, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="plan-toolbar-menu" ref={rootRef}>
      <button
        type="button"
        className="plan-toolbar-menu-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Plan options"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div id={menuId} className="plan-toolbar-menu-panel" role="menu">
          <label
            className="plan-toolbar-menu-item plan-toolbar-menu-item--toggle"
            role="menuitemcheckbox"
            aria-checked={pushEnabled}
          >
            <input
              type="checkbox"
              checked={pushEnabled}
              disabled={pushBusy}
              onChange={() => onTogglePush()}
            />
            <span>Get daily reminders (8am UTC)</span>
          </label>
          <button
            type="button"
            role="menuitem"
            className="plan-toolbar-menu-item plan-toolbar-menu-item--danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete plan
          </button>
        </div>
      ) : null}
    </div>
  );
}
