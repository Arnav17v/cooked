import { Suspense } from "react";

import { LandingCustomCursor } from "@/components/landing/landing-custom-cursor";
import { LandingNav } from "@/components/landing/landing-nav";
import { RoastUpload } from "@/components/roast/roast-upload";

import "../landing-v3.css";

export default function RoastPage() {
  return (
    <div className="landing-v3 landing-roast-app">
      <LandingCustomCursor />
      <LandingNav />

      <div className="landing-page">
        <section className="landing-roast-hero">
          <p className="landing-hero-eyebrow">{"// upload"}</p>
          <h1 className="landing-roast-title">Upload resume</h1>
          <p className="landing-roast-sub">
            Paste or upload a PDF, pick your role, run the pipeline. When the roast finishes you&apos;ll
            land on your dashboard with tabs for score (including improvements), questions, and notes.
          </p>
        </section>
      </div>

      <div className="landing-page landing-roast-form">
        <Suspense fallback={<div className="landing-roast-loading">Loading…</div>}>
          <RoastUpload />
        </Suspense>
      </div>
    </div>
  );
}
