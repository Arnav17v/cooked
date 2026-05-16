"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function LandingHeroActions() {
  const { isSignedIn, isLoaded } = useAuth();
  const primaryHref = isLoaded && isSignedIn ? "/roast" : "/roast";
  const primaryLabel = isLoaded && isSignedIn ? "Roast another resume" : "Find out if you're cooked";

  return (
    <div className="landing-hero-actions">
      <Link href={primaryHref} className="landing-btn-primary">
        <span>{primaryLabel}</span>
        <span aria-hidden>→</span>
      </Link>
      {!isLoaded || !isSignedIn ? (
        <Link href="/sign-up" className="landing-btn-ghost">
          Create account
        </Link>
      ) : null}
      <Link href="/#how" className="landing-btn-ghost">
        See how it works
      </Link>
    </div>
  );
}
