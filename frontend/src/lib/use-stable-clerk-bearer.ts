"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef } from "react";

/**
 * Clerk's `getToken` callback identity changes every render. Listing it in
 * `useEffect` / `useCallback` deps causes fetch loops against `/me/*`.
 */
export function useStableClerkBearer(): () => Promise<string | undefined> {
  const { isSignedIn, getToken } = useAuth();
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  });

  return useCallback(async () => {
    if (!isSignedIn) return undefined;
    return (await getTokenRef.current()) ?? undefined;
  }, [isSignedIn]);
}
