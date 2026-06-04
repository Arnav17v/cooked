"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TRAIL_COUNT = 10;

const HOVER_SELECTOR =
  "a, button, summary, input, textarea, select, label, .landing-feat, .landing-stat, .landing-step, .landing-score-card-big, .landing-flag-list li, .roast-dropzone, .roast-field-input, .roast-field-select, .roast-textarea, .roast-input-mode-tab, .roast-file-remove, .landing-dash-share-btn, .landing-dash-plan-btn, .score-card-root, .landing-notes-drawer-scrim, .landing-notes-drawer-sheet, .landing-notes-drawer-icon-btn, .landing-notes-drawer-edit, .landing-notes-drawer-done, .landing-nav-menu-btn, .landing-dash-mobile-tab, .plan-primary-btn, .plan-secondary-btn, .plan-curriculum-item, .landing-nav-link, .landing-nav-plan, .landing-nav-cta, .plan-input, .plan-textarea";

function isHoverTarget(container: Element, x: number, y: number): boolean {
  const target = document.elementFromPoint(x, y);
  if (!target || !container.contains(target)) return false;
  return target.closest(HOVER_SELECTOR) !== null;
}

export function LandingCustomCursor() {
  const [mounted, setMounted] = useState(false);
  const curWrapRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
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

    const container = document.querySelector(".landing-v3");
    if (!container) return;

    const syncHover = (x: number, y: number) => {
      root.classList.toggle("landing-cursor-hover", isHoverTarget(container, x, y));
    };

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (curWrapRef.current) {
        curWrapRef.current.style.left = `${e.clientX}px`;
        curWrapRef.current.style.top = `${e.clientY}px`;
      }
      syncHover(e.clientX, e.clientY);
    };

    const onLeaveWindow = () => {
      root.classList.remove("landing-cursor-hover", "landing-cursor-click");
    };

    const onDown = () => root.classList.add("landing-cursor-click");
    const onUp = () => root.classList.remove("landing-cursor-click");

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeaveWindow);
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

      trailRefs.current.forEach((t, i) => {
        if (!t) return;
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
      document.removeEventListener("mouseleave", onLeaveWindow);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      root.removeAttribute("data-landing-cursor");
      root.classList.remove("landing-cursor-hover", "landing-cursor-click");
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <div ref={curWrapRef} className="landing-cur" aria-hidden>
        <div className="landing-cur-dot" />
      </div>
      <div ref={ringRef} className="landing-cur-ring" aria-hidden />
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
