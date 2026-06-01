"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { motion, useReducedMotion } from "motion/react";

const MotionLink = motion.create(Link);

export function LandingHeroActions() {
  const { isSignedIn, isLoaded } = useAuth();
  const reduce = useReducedMotion();

  const planHref =
    isLoaded && isSignedIn ? "/plan" : "/sign-up?redirect_url=%2Fplan";
  const planLabel =
    isLoaded && isSignedIn ? "Open prep plan" : "Start prep plan";

  const hover = reduce ? undefined : { y: -1 };
  const tap = reduce ? undefined : { scale: 0.98 };

  return (
    <div className="landing-hero-actions">
      <MotionLink
        href={planHref}
        className="landing-btn-primary"
        whileHover={hover}
        whileTap={tap}
      >
        <span>{planLabel}</span>
        <span aria-hidden>→</span>
      </MotionLink>
      <MotionLink
        href="/roast"
        className="landing-btn-ghost"
        whileHover={hover}
        whileTap={tap}
      >
        Roast my resume
      </MotionLink>
      <MotionLink href="/#how" className="landing-btn-ghost" whileHover={hover} whileTap={tap}>
        See how it works
      </MotionLink>
    </div>
  );
}
