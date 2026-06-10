"use client";

import { useAuth } from "@clerk/nextjs";
import { FloatingDock } from "./floating-dock";

/**
 * Renders the FloatingDock only when the user is signed in.
 * Visibility is further constrained to mobile widths via the
 * CSS class `.landing-dock` (hidden at md+ breakpoint).
 * Mounted once in the root layout so every page benefits.
 */
export function ConditionalFloatingDock() {
  const { isSignedIn, isLoaded } = useAuth();

  // Don't render anything until Clerk has hydrated, to avoid flash
  if (!isLoaded || !isSignedIn) return null;

  return <FloatingDock />;
}
