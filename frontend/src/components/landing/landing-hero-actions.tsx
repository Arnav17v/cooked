"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const MotionLink = motion.create(Link);

export function LandingHeroActions() {
  const { isSignedIn, isLoaded } = useAuth();
  const reduce = useReducedMotion();

  const primaryHref =
    isLoaded && isSignedIn ? "/dashboard" : "/roast";
  const primaryLabel =
    isLoaded && isSignedIn ? "Open dashboard" : "Start interview prep";

  const hover = reduce ? undefined : { y: -1 };
  const tap = reduce ? undefined : { scale: 0.98 };

  return (
    <div className="landing-hero-actions">
      <MotionLink
        href={primaryHref}
        className="landing-btn-primary"
        whileHover={hover}
        whileTap={tap}
      >
        <span>{primaryLabel}</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      </MotionLink>
      <MotionLink
        href="/roast"
        className="landing-btn-ghost"
        whileHover={hover}
        whileTap={tap}
      >
        Score my resume
      </MotionLink>
      <MotionLink href="/#sample" className="landing-btn-ghost" whileHover={hover} whileTap={tap}>
        See sample score
      </MotionLink>
    </div>
  );
}
