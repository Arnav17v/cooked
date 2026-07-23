"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { createTimeline } from "animejs";

type TimelineBuilder = (
  tl: ReturnType<typeof createTimeline>,
  el: HTMLElement,
) => void;

type ReducedMotionHandler = (el: HTMLElement) => void;

function revealReducedMotionTargets(el: HTMLElement) {
  const targets = el.querySelectorAll<HTMLElement>("[data-anime-target]");

  targets.forEach((target) => {
    if (target.style.opacity === "0") target.style.opacity = "1";
    if (target.dataset.animeTransform !== "preserve") {
      target.style.transform = "none";
    }
    if (target.dataset.animeWidth) {
      target.style.width = target.dataset.animeWidth;
    }
    if (target.dataset.animeScaleX) {
      target.style.transform = `scaleX(${target.dataset.animeScaleX})`;
      target.style.transformOrigin = "left center";
    }
    if (target.dataset.target) {
      target.textContent = target.dataset.target;
    }
  });
}

/**
 * Creates an IntersectionObserver that fires an anime.js timeline once when
 * the ref'd element enters the viewport at the given threshold.
 */
export function useAnimeOnScroll<T extends HTMLElement = HTMLDivElement>(
  builder: TimelineBuilder,
  options: {
    threshold?: number;
    rootMargin?: string;
    onReducedMotion?: ReducedMotionHandler;
    /** Pass deps that invalidate the effect, for example data-driven values. */
    deps?: unknown[];
  } = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const {
    threshold = 0.25,
    rootMargin = "0px",
    onReducedMotion = revealReducedMotionTargets,
    deps = [],
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      onReducedMotion(el);
      return;
    }

    const tl = createTimeline({
      autoplay: false,
      defaults: { ease: "outExpo" },
    });
    builder(tl, el);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          tl.play();
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      tl.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/**
 * Runs an anime.js animation immediately on mount (no scroll trigger).
 * Useful for hero / above-the-fold animations.
 */
export function useAnimeOnMount<T extends HTMLElement = HTMLDivElement>(
  builder: TimelineBuilder,
  options: {
    delay?: number;
    onReducedMotion?: ReducedMotionHandler;
    deps?: unknown[];
  } = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const {
    delay = 0,
    onReducedMotion = revealReducedMotionTargets,
    deps = [],
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      onReducedMotion(el);
      return;
    }

    const tl = createTimeline({
      autoplay: false,
      defaults: { ease: "outExpo" },
    });
    builder(tl, el);

    const timeout = setTimeout(() => tl.play(), delay);
    return () => {
      clearTimeout(timeout);
      tl.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
