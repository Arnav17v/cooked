"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { fadeUp, landingTransition, mergeReducedMotion } from "@/lib/landing-motion";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function LandingReveal({ children, className = "", delay = 0 }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-72px" }}
      variants={mergeReducedMotion(reduce, fadeUp)}
      transition={{ ...landingTransition(), delay: reduce ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}
