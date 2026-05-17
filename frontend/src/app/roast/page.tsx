import { Suspense } from "react";

import { LandingCustomCursor } from "@/components/landing/landing-custom-cursor";
import { LandingNav } from "@/components/landing/landing-nav";
import { RoastUpload } from "@/components/roast/roast-upload";

import "../landing-v3.css";

export default function RoastPage() {
  return (
    <div className="landing-v3 overflow-x-clip max-w-full bg-lv-black text-lv-cream">
      <LandingCustomCursor />
      <LandingNav />

      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-12">
        <section className="border-b border-lv-rule py-10 md:py-[72px] md:pb-10">
          <p className="mb-7 flex items-center gap-3 font-jetbrains text-[11px] uppercase tracking-[0.2em] text-lv-rust before:h-px before:w-8 before:bg-lv-rust before:content-['']">
            {"// upload"}
          </p>
          <h1 className="mt-4 font-playfair text-[1.75rem] font-normal leading-tight tracking-tight text-lv-cream sm:text-[clamp(2rem,5vw,2.75rem)]">
            Upload resume
          </h1>
          <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-lv-cream-dim sm:text-sm sm:leading-7">
            Paste or upload a PDF, pick your role, run the pipeline. When the roast finishes you&apos;ll
            land on your dashboard with tabs for score (including improvements), questions, and notes.
          </p>
        </section>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 pb-14 pt-7 sm:px-6 sm:pb-24 sm:pt-12 lg:px-12 lg:pb-24">
        <Suspense
          fallback={
            <div className="border border-lv-rule bg-lv-surface px-6 py-12 text-center font-jetbrains text-[13px] text-lv-cream-dim">
              Loading…
            </div>
          }
        >
          <RoastUpload />
        </Suspense>
      </div>
    </div>
  );
}
