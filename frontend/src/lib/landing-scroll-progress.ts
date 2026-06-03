"use client";

import { useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, type RefObject } from "react";

type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>["offset"];

const DEFAULT_OFFSET: ScrollOffset = ["start 0.85", "end 0.25"];

export function useLandingScrollFill(offset: ScrollOffset = DEFAULT_OFFSET): {
  ref: RefObject<HTMLDivElement | null>;
  fillScale: MotionValue<number>;
  scrollYProgress: MotionValue<number>;
  reduce: boolean | null;
} {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  });
  const fillScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return { ref, fillScale, scrollYProgress, reduce };
}
