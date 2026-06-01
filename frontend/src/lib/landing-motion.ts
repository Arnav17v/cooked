import type { Transition, Variants } from "motion/react";

import { EASE_DEFAULT } from "@/lib/motion-easing";

export const LANDING_DURATION = {
  fast: 0.35,
  normal: 0.5,
  slow: 0.65,
} as const;

export const LANDING_EASE = EASE_DEFAULT;

export const landingTransition = (duration = LANDING_DURATION.normal): Transition => ({
  duration,
  ease: LANDING_EASE,
});

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleInSoft: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1 },
};

export const heroLine: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: landingTransition(LANDING_DURATION.normal) },
};

export const reducedMotionVariants = (): Variants => ({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
});

export function mergeReducedMotion(reduce: boolean | null, variants: Variants): Variants {
  return reduce ? reducedMotionVariants() : variants;
}
