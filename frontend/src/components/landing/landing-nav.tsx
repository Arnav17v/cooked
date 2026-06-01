"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

const MOBILE_NAV_MQ = "(max-width: 768px)";

export function LandingNav() {
  const panelId = useId();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const roastHref = isLoaded && isSignedIn ? "/dashboard" : "/roast";
  const roastLabel = isLoaded && isSignedIn ? "Dashboard" : "Roast my resume";

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const onViewportChange = () => {
      if (!mq.matches) closeMenu();
    };
    mq.addEventListener("change", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    return () => {
      mq.removeEventListener("change", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [closeMenu]);

  const linkClass = (active: boolean) =>
    `landing-nav-link${active ? " landing-nav-link--active" : ""}`;

  const navLinks = (
    <>
      <Link href="/#features" className="landing-nav-link" onClick={closeMenu}>
        Features
      </Link>
      <Link href="/#how" className="landing-nav-link" onClick={closeMenu}>
        How it works
      </Link>
      {isLoaded && isSignedIn ? (
        <>
          <Link href="/roast" className={linkClass(pathname === "/roast")} onClick={closeMenu}>
            Upload
          </Link>
        </>
      ) : (
        <Link href="/sign-in" className="landing-nav-link" onClick={closeMenu}>
          Log in
        </Link>
      )}
      {isLoaded && isSignedIn ? (
        <Link
          href="/plan"
          className={
            pathname === "/plan" || pathname.startsWith("/prep")
              ? "landing-nav-plan landing-nav-plan--active"
              : "landing-nav-plan"
          }
          onClick={closeMenu}
        >
          Plan
        </Link>
      ) : null}
      <Link
        href="/seminar"
        className={linkClass(
          pathname === "/seminar" || pathname.startsWith("/seminar/"),
        )}
        onClick={closeMenu}
      >
        Seminar
      </Link>
      <Link href={roastHref} className="landing-nav-cta" onClick={closeMenu}>
        {roastLabel}
      </Link>
    </>
  );

  const mobileOverlay =
    mounted &&
    createPortal(
      <div className="landing-nav-portal" aria-hidden={!menuOpen}>
        <button
          type="button"
          className={`landing-nav-scrim${menuOpen ? " landing-nav-scrim--visible" : ""}`}
          aria-label="Close menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={closeMenu}
        />
        <div
          id={panelId}
          className={`landing-nav-panel${menuOpen ? " landing-nav-panel--open" : ""}`}
          aria-hidden={!menuOpen}
        >
          <div className="landing-nav-panel-inner">{navLinks}</div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <nav className="landing-nav">
        <Link href="/" className="landing-nav-logo" onClick={closeMenu}>
          <span>{"//"}</span> am i cooked?
        </Link>

        <div className="landing-nav-desktop">{navLinks}</div>

        <button
          type="button"
          className="landing-nav-menu-btn"
          aria-expanded={menuOpen}
          aria-controls={panelId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
        </button>
      </nav>
      {mobileOverlay}
    </>
  );
}
