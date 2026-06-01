"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import {
  landingTransition,
  mergeReducedMotion,
  staggerContainer,
  staggerItem,
} from "@/lib/landing-motion";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul";
};

export function LandingStagger({ children, className = "", as = "div" }: Props) {
  const reduce = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-64px" }}
      variants={mergeReducedMotion(reduce, staggerContainer)}
    >
      {children}
    </Component>
  );
}

type ItemProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
};

export function LandingStaggerItem({ children, className = "", as = "div" }: ItemProps) {
  const reduce = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      variants={mergeReducedMotion(reduce, staggerItem)}
      transition={landingTransition()}
    >
      {children}
    </Component>
  );
}
