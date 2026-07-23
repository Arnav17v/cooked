"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { animate } from "animejs";
import { useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useReducedMotion } from "motion/react";

export function LandingMagneticLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
    animate(ref.current, { x, y, duration: 280, ease: "outExpo" });
  };

  const handleMouseLeave = () => {
    if (reduce || !ref.current) return;
    animate(ref.current, {
      x: 0,
      y: 0,
      duration: 500,
      ease: "outElastic(1, 0.5)",
    });
  };

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </Link>
  );
}

export function LandingHeroActions() {
  const { isSignedIn, isLoaded } = useAuth();

  const primaryHref = isLoaded && isSignedIn ? "/dashboard" : "/roast";
  const primaryLabel =
    isLoaded && isSignedIn ? "Open dashboard" : "Start interview prep";

  return (
    <div className="landing-hero-actions">
      <LandingMagneticLink href={primaryHref} className="landing-btn-primary">
        <span>{primaryLabel}</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      </LandingMagneticLink>
      <LandingMagneticLink href="/roast" className="landing-btn-ghost">
        Score my resume
      </LandingMagneticLink>
      <LandingMagneticLink href="/#sample" className="landing-btn-ghost">
        See sample score
      </LandingMagneticLink>
    </div>
  );
}
