"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchEntitlements, type EntitlementsResponse } from "@/lib/api";
import { useStableClerkBearer } from "@/lib/use-stable-clerk-bearer";

type EntitlementsContextValue = {
  entitlements: EntitlementsResponse | null;
  loading: boolean;
  isPro: boolean;
  refresh: (resumeId?: string) => Promise<void>;
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({
  children,
  resumeId,
}: {
  children: ReactNode;
  resumeId?: string | null;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const bearer = useStableClerkBearer();
  const [entitlements, setEntitlements] = useState<EntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    async (nextResumeId?: string) => {
      if (!isSignedIn) {
        setEntitlements(null);
        setLoading(false);
        return;
      }
      const token = await bearer();
      if (!token) {
        setEntitlements(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const rid = nextResumeId ?? resumeId ?? undefined;
        const data = await fetchEntitlements(token, rid);
        setEntitlements(data);
      } catch {
        setEntitlements(null);
      } finally {
        setLoading(false);
      }
    },
    [bearer, isSignedIn, resumeId],
  );

  useEffect(() => {
    if (!isLoaded) return;
    void refresh();
  }, [isLoaded, isSignedIn, refresh, resumeId]);

  const value = useMemo(
    () => ({
      entitlements,
      loading,
      isPro: entitlements?.plan === "pro",
      refresh,
    }),
    [entitlements, loading, refresh],
  );

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements(): EntitlementsContextValue {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) {
    return {
      entitlements: null,
      loading: false,
      isPro: false,
      refresh: async () => {},
    };
  }
  return ctx;
}

export function formatHoursRemaining(hours: number | null | undefined): string {
  if (hours == null || hours <= 0) return "0m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
