"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

export function LandingNav() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  const roastHref = isLoaded && isSignedIn ? "/dashboard" : "/roast";
  const roastLabel = isLoaded && isSignedIn ? "Dashboard" : "Roast my resume";

  return (
    <nav className="landing-nav">
      <Link href="/" className="landing-nav-logo">
        <span>{"//"}</span> am i cooked?
      </Link>
      <div className="landing-nav-right">
        <Link href="/#features" className="landing-nav-link">
          Features
        </Link>
        <Link href="/#how" className="landing-nav-link">
          How it works
        </Link>
        {isLoaded && isSignedIn ? (
          <>
            <Link
              href="/dashboard"
              className={`landing-nav-link${pathname === "/dashboard" ? " landing-nav-link--active" : ""}`}
            >
              Dashboard
            </Link>
            <Link
              href="/roast"
              className={`landing-nav-link${pathname === "/roast" ? " landing-nav-link--active" : ""}`}
            >
              Upload
            </Link>
          </>
        ) : (
          <Link href="/sign-in" className="landing-nav-link">
            Log in
          </Link>
        )}
        <Link href={roastHref} className="landing-nav-cta">
          {roastLabel}
        </Link>
      </div>
    </nav>
  );
}
