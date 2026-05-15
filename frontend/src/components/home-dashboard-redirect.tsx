"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { fetchMyRoasts } from "@/lib/api";

/** sessionStorage: "1" = may auto-redirect once; "0" = already redirected this tab session. */
const HOME_REDIRECT_ONCE_KEY = "cooked_home_dashboard_redirect_once";

/** Signed-in users with roasts get one auto-redirect to the dashboard per browser session. */
export function HomeDashboardRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stayOnHome = searchParams.get("home") === "1";
  const { isSignedIn, isLoaded, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded || stayOnHome || !isSignedIn) return;

    if (typeof window !== "undefined") {
      const flag = sessionStorage.getItem(HOME_REDIRECT_ONCE_KEY);
      if (flag === "0") return;
    }

    let cancelled = false;
    (async () => {
      const tok = await getToken();
      if (!tok || cancelled) return;
      try {
        const items = await fetchMyRoasts(tok);
        if (cancelled || items.length === 0) return;
        const pick = items.find((i) => i.analysis_status === "done") ?? items[0];
        if (typeof window !== "undefined") {
          sessionStorage.setItem(HOME_REDIRECT_ONCE_KEY, "0");
        }
        router.replace(`/dashboard?resume=${pick.resume_id}`);
      } catch {
        /* ignore — marketing home stays visible */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, router, stayOnHome]);

  return null;
}
