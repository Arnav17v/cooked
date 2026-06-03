"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const MotionLink = motion.create(Link);

export function LandingFooterCta() {
  const { isSignedIn, isLoaded } = useAuth();
  const reduce = useReducedMotion();

  const planHref =
    isLoaded && isSignedIn ? "/plan" : "/roast";
  const planLabel =
    isLoaded && isSignedIn ? "Continue prep plan" : "Start interview prep";

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
        <ArrowRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      </MotionLink>
      {isLoaded && isSignedIn ? (
        <MotionLink href="/dashboard" className="landing-btn-ghost" whileHover={hover} whileTap={tap}>
          Dashboard
        </MotionLink>
      ) : (
        <MotionLink href="/roast" className="landing-btn-ghost" whileHover={hover} whileTap={tap}>
          Score my resume
        </MotionLink>
      )}
    </div>
  );
}
