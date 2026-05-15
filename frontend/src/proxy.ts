import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share(.*)",
]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

/** Clerk must not touch Next internals; matcher-only excludes are brittle with path-to-regexp. */
function isNextInternalOrPublicAsset(pathname: string) {
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return true;
  }
  // Files in /public (images, fonts, etc.)
  return /\.[a-zA-Z0-9]{2,16}$/.test(pathname);
}

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (isNextInternalOrPublicAsset(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return clerk(request, event);
}

export const config = {
  matcher: [
    "/(.*)",
  ],
};
