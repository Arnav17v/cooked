"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TRAIL_COUNT = 10;

const HOVER_SELECTOR =
  "a, button, .landing-feat, .landing-stat, .landing-step, .landing-score-card-big, .landing-flag-list li, .roast-dropzone, .roast-field-input, .roast-field-select, .roast-textarea, .roast-input-mode-tab, .roast-file-remove, .landing-dash-share-btn, .landing-dash-plan-btn, .score-card-root, .landing-notes-drawer-scrim, .landing-notes-drawer-sheet, .landing-notes-drawer-icon-btn, .landing-notes-drawer-edit, .landing-notes-drawer-done, .landing-nav-menu-btn, .landing-dash-mobile-tab";

const TEXT_SELECTOR =
  "p, li, h1, h2, h3, .landing-score-roast, .landing-hero-sub, .landing-feat-desc, .landing-stat-desc, .landing-step-desc, .landing-score-right p, .landing-meta-right, .landing-footer-cta-sub";

export function LandingCustomCursor() {
  const [mounted, setMounted] = useState(false);
  const curWrapRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const vimRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mouseRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const trailPosRef = useRef<{ x: number; y: number }[]>(
    Array.from({ length: TRAIL_COUNT }, () => ({ x: 0, y: 0 })),
  );

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    const root = document.documentElement;
    root.setAttribute("data-landing-cursor", "");

    let hoverCount = 0;
    let vimCount = 0;

    const setHover = (on: boolean) => {
      if (on) {
        hoverCount += 1;
        root.classList.add("landing-cursor-hover");
      } else {
        hoverCount = Math.max(0, hoverCount - 1);
        if (hoverCount === 0) root.classList.remove("landing-cursor-hover");
      }
    };

    const setVim = (on: boolean) => {
      if (on) {
        vimCount += 1;
        root.classList.add("landing-cursor-vim");
        root.classList.remove("landing-cursor-hover");
        hoverCount = 0;
      } else {
        vimCount = Math.max(0, vimCount - 1);
        if (vimCount === 0) root.classList.remove("landing-cursor-vim");
      }
    };

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (curWrapRef.current) {
        curWrapRef.current.style.left = `${e.clientX}px`;
        curWrapRef.current.style.top = `${e.clientY}px`;
      }
      if (vimRef.current) {
        vimRef.current.style.left = `${e.clientX}px`;
        vimRef.current.style.top = `${e.clientY}px`;
      }
    };

    const onDown = () => root.classList.add("landing-cursor-click");
    const onUp = () => root.classList.remove("landing-cursor-click");

    const container = document.querySelector(".landing-v3");
    if (!container) return;

    const hoverEls = container.querySelectorAll(HOVER_SELECTOR);
    const hoverEnter = () => setHover(true);
    const hoverLeave = () => setHover(false);
    hoverEls.forEach((el) => {
      el.addEventListener("mouseenter", hoverEnter);
      el.addEventListener("mouseleave", hoverLeave);
    });

    const textEls = container.querySelectorAll(TEXT_SELECTOR);
    const vimEnter = () => setVim(true);
    const vimLeave = () => setVim(false);
    textEls.forEach((el) => {
      el.addEventListener("mouseenter", vimEnter);
      el.addEventListener("mouseleave", vimLeave);
    });

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);

    let ringRaf = 0;
    const animRing = () => {
      const { x: mx, y: my } = mouseRef.current;
      const ring = ringPosRef.current;
      ring.x += (mx - ring.x) * 0.1;
      ring.y += (my - ring.y) * 0.1;
      if (ringRef.current) {
        ringRef.current.style.left = `${ring.x}px`;
        ringRef.current.style.top = `${ring.y}px`;
      }
      ringRaf = requestAnimationFrame(animRing);
    };
    ringRaf = requestAnimationFrame(animRing);

    let trailRaf = 0;
    const animTrail = () => {
      const { x: mx, y: my } = mouseRef.current;
      const pos = trailPosRef.current;
      pos.unshift({ x: mx, y: my });
      pos.pop();

      const vim = root.classList.contains("landing-cursor-vim");
      trailRefs.current.forEach((t, i) => {
        if (!t) return;
        if (vim) {
          t.style.opacity = "0";
          return;
        }
        t.style.left = `${pos[i].x}px`;
        t.style.top = `${pos[i].y}px`;
        t.style.opacity = String((1 - i / TRAIL_COUNT) * 0.3);
        t.style.transform = `translate(-50%, -50%) scale(${1 - i * 0.07})`;
      });
      trailRaf = requestAnimationFrame(animTrail);
    };
    trailRaf = requestAnimationFrame(animTrail);

    return () => {
      cancelAnimationFrame(ringRaf);
      cancelAnimationFrame(trailRaf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      hoverEls.forEach((el) => {
        el.removeEventListener("mouseenter", hoverEnter);
        el.removeEventListener("mouseleave", hoverLeave);
      });
      textEls.forEach((el) => {
        el.removeEventListener("mouseenter", vimEnter);
        el.removeEventListener("mouseleave", vimLeave);
      });
      root.removeAttribute("data-landing-cursor");
      root.classList.remove("landing-cursor-hover", "landing-cursor-click", "landing-cursor-vim");
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <div ref={curWrapRef} className="landing-cur" aria-hidden>
        <div className="landing-cur-dot" />
      </div>
      <div ref={ringRef} className="landing-cur-ring" aria-hidden />
      <div ref={vimRef} className="landing-vim-cursor" aria-hidden />
      {Array.from({ length: TRAIL_COUNT }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="landing-cur-trail"
          aria-hidden
        />
      ))}
    </>,
    document.body,
  );
}
