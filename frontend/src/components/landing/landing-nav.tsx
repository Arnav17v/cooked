"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

export function LandingNav() {
  const panelId = useId();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const roastHref = isLoaded && isSignedIn ? "/dashboard" : "/roast";
  const roastLabel = isLoaded && isSignedIn ? "Dashboard" : "Roast my resume";

  const closeMenu = useCallback(() => setMenuOpen(false), []);

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
          <Link
            href="/dashboard"
            className={linkClass(pathname === "/dashboard")}
            onClick={closeMenu}
          >
            Dashboard
          </Link>
          <Link
            href="/roast"
            className={linkClass(pathname === "/roast")}
            onClick={closeMenu}
          >
            Upload
          </Link>
        </>
      ) : (
        <Link href="/sign-in" className="landing-nav-link" onClick={closeMenu}>
          Log in
        </Link>
      )}
      <Link href={roastHref} className="landing-nav-cta" onClick={closeMenu}>
        {roastLabel}
      </Link>
    </>
  );

  return (
    <nav className={`landing-nav${menuOpen ? " landing-nav--open" : ""}`}>
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

      <button
        type="button"
        className="landing-nav-scrim"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <div id={panelId} className="landing-nav-panel" aria-hidden={!menuOpen}>
        <div className="landing-nav-panel-inner">{navLinks}</div>
      </div>
    </nav>
  );
}
