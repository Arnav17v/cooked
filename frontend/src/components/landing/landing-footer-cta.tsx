"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { motion, useReducedMotion } from "motion/react";

const MotionLink = motion.create(Link);

export function LandingFooterCta() {
  const { isSignedIn, isLoaded } = useAuth();
  const reduce = useReducedMotion();

  const planHref =
    isLoaded && isSignedIn ? "/plan" : "/sign-up?redirect_url=%2Fplan";
  const planLabel =
    isLoaded && isSignedIn ? "Continue prep plan" : "Start prep plan";

  const hover = reduce ? undefined : { y: -1 };
  const tap = reduce ? undefined : { scale: 0.98 };

  return (
    <div className="landing-footer-cta-actions">
      {isLoaded && !isSignedIn ? (
        <MotionLink href="/sign-in" className="landing-btn-ghost" whileHover={hover} whileTap={tap}>
          Log in
        </MotionLink>
      ) : null}
      <MotionLink
        href={planHref}
        className="landing-btn-primary"
        whileHover={hover}
        whileTap={tap}
      >
        <span>{planLabel}</span>
        <span aria-hidden>→</span>
      </MotionLink>
      {isLoaded && isSignedIn ? (
        <MotionLink href="/dashboard" className="landing-btn-ghost" whileHover={hover} whileTap={tap}>
          Dashboard
        </MotionLink>
      ) : (
        <MotionLink href="/roast" className="landing-btn-ghost" whileHover={hover} whileTap={tap}>
          Roast my resume
        </MotionLink>
      )}
    </div>
  );
}
