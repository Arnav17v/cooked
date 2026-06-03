"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { LandingNavLinks } from "@/components/landing/landing-nav-links";

const MOBILE_NAV_MQ = "(max-width: 768px)";

function NavLinksFallback() {
  return <div className="landing-nav-desktop landing-nav-desktop--loading" aria-hidden />;
}

export function LandingNav() {
  const panelId = useId();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
          <Suspense fallback={null}>
            <LandingNavLinks
              className="landing-nav-panel-inner"
              onNavigate={closeMenu}
            />
          </Suspense>
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

        <Suspense fallback={<NavLinksFallback />}>
          <LandingNavLinks className="landing-nav-desktop" onNavigate={closeMenu} />
        </Suspense>

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
