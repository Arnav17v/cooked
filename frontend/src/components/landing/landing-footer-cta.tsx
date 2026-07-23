"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { LandingMagneticLink } from "@/components/landing/landing-hero-actions";

export function LandingFooterCta() {
  const { isSignedIn, isLoaded } = useAuth();

  const planHref =
    isLoaded && isSignedIn ? "/plan" : "/roast";
  const planLabel =
    isLoaded && isSignedIn ? "Continue prep plan" : "Start interview prep";

  return (
    <div className="landing-footer-cta-actions flex justify-center mt-8">
      <LandingMagneticLink href={planHref} className="landing-btn-primary">
        <span>{planLabel}</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      </LandingMagneticLink>
    </div>
  );
}
