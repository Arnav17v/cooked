"use client";

import dynamic from "next/dynamic";

/**
 * Client-side-only host for the floating dock.
 * `ssr: false` must live inside a Client Component in Next.js 15 App Router.
 */
const ConditionalFloatingDock = dynamic(
  () =>
    import("@/components/landing/conditional-floating-dock").then(
      (m) => m.ConditionalFloatingDock,
    ),
  { ssr: false },
);

export function FloatingDockProvider() {
  return <ConditionalFloatingDock />;
}
