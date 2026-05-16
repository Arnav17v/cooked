"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function LandingFooterCta() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <div className="landing-footer-cta-actions">
      {isLoaded && !isSignedIn ? (
        <Link href="/sign-in" className="landing-btn-ghost">
          Log in
        </Link>
      ) : null}
      <Link href="/roast" className="landing-btn-primary">
        <span>Roast my resume</span>
        <span aria-hidden>→</span>
      </Link>
      {isLoaded && !isSignedIn ? (
        <Link href="/sign-up" className="landing-btn-ghost">
          Sign up
        </Link>
      ) : (
        <Link href="/dashboard" className="landing-btn-ghost">
          Open dashboard
        </Link>
      )}
    </div>
  );
}
