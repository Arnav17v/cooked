"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { ArrowRight, Flame } from "lucide-react";

export function MarketingNav() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-lc-border bg-lc-header/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-lc-orange text-black">
            <Flame className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-[15px] text-lc-text">am i cooked</span>
        </Link>

        <div className="hidden items-center gap-1 text-[13px] text-lc-muted md:flex">
          <Link
            href="/#features"
            className="rounded-md px-3 py-1.5 hover:bg-white/5 hover:text-lc-text"
          >
            What you get
          </Link>
          {isLoaded && isSignedIn ? (
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 hover:bg-white/5 hover:text-lc-text"
            >
              Dashboard
            </Link>
          ) : null}
          <Link
            href="/roast"
            className="rounded-md px-3 py-1.5 hover:bg-white/5 hover:text-lc-text"
          >
            Upload
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!isLoaded ? (
            <span className="h-8 w-[4.5rem] animate-pulse rounded-md bg-white/5" aria-hidden />
          ) : isSignedIn ? (
            <UserButton
              appearance={{
                variables: { colorPrimary: "#ffa116" },
                elements: {
                  userButtonPopoverCard: "border border-lc-border bg-lc-surface",
                },
              }}
            />
          ) : (
            <Link
              href="/sign-in"
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-lc-muted hover:bg-white/5 hover:text-lc-text"
            >
              Sign in
            </Link>
          )}
          <Link
            href={isLoaded && isSignedIn ? "/dashboard" : "/roast"}
            className="inline-flex items-center gap-1.5 rounded-md bg-lc-orange px-3 py-1.5 text-[13px] font-medium text-black hover:bg-lc-orangeHover"
          >
            {isLoaded && isSignedIn ? "Dashboard" : "Roast"}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
