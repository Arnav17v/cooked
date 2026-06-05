"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { User } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  onNavigate?: () => void;
  className?: string;
};

export function LandingNavUserMenu({ onNavigate, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickItem() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={rootRef} className={`landing-nav-user-menu ${className}`.trim()}>
      <button
        type="button"
        className={`landing-nav-user-btn${open ? " landing-nav-user-btn--open" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <User className="landing-nav-user-icon" strokeWidth={1.75} aria-hidden />
      </button>
      {open ? (
        <div id={menuId} className="landing-nav-user-dropdown" role="menu">
          <Link
            href="/roast?new=1"
            className="landing-nav-user-dropdown-item"
            role="menuitem"
            onClick={pickItem}
          >
            Upload new
          </Link>
          <Link
            href="/pricing"
            className="landing-nav-user-dropdown-item"
            role="menuitem"
            onClick={pickItem}
          >
            Pricing
          </Link>
          <SignOutButton redirectUrl="/">
            <button
              type="button"
              className="landing-nav-user-dropdown-item landing-nav-user-dropdown-item--button"
              role="menuitem"
              onClick={pickItem}
            >
              Log out
            </button>
          </SignOutButton>
        </div>
      ) : null}
    </div>
  );
}
