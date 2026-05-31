import type { Metadata } from "next";

import { LandingCustomCursor } from "@/components/landing/landing-custom-cursor";
import { LandingNav } from "@/components/landing/landing-nav";
import { SeminarListView } from "@/components/seminar/seminar-list-view";
import { getPublicSeminarSessions } from "@/lib/api";

import "../landing-v3.css";

export const metadata: Metadata = {
  title: "Seminars | Am I Cooked?",
  description: "Live small-batch sessions with real engineers.",
};

export default async function SeminarPage() {
  let sessions: Awaited<ReturnType<typeof getPublicSeminarSessions>> = [];
  try {
    sessions = await getPublicSeminarSessions();
  } catch {
    sessions = [];
  }

  const upcoming = sessions.filter((s) => s.status !== "completed");

  return (
    <div className="landing-v3">
      <LandingCustomCursor />
      <LandingNav />
      <SeminarListView sessions={upcoming.length > 0 ? upcoming : sessions} />
    </div>
  );
}
