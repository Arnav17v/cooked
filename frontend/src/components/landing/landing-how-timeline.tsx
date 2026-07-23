"use client";

import { useAnimeOnScroll } from "@/lib/use-anime-on-scroll";
import { STEPS } from "@/lib/landing-content";

export function LandingHowTimeline() {
  const ref = useAnimeOnScroll(
    (tl, el) => {
      const icons = el.querySelectorAll<HTMLElement>(".how-step-icon");
      const titles = el.querySelectorAll<HTMLElement>(".how-step-title");
      const bodies = el.querySelectorAll<HTMLElement>(".how-step-body");
      const connectors = el.querySelectorAll<HTMLElement>(".how-connector");

      icons.forEach((icon, idx) => {
        tl.add(icon, {
          scale: [0.4, 1],
          opacity: [0, 1],
          duration: 480,
          ease: "outBack(2)",
        }, idx * 160);
      });

      titles.forEach((title, idx) => {
        tl.add(title, {
          opacity: [0, 1],
          y: [8, 0],
          duration: 380,
          ease: "outExpo",
        }, idx * 160 + 80);
      });

      bodies.forEach((body, idx) => {
        tl.add(body, {
          opacity: [0, 1],
          y: [8, 0],
          duration: 360,
          ease: "outExpo",
        }, idx * 160 + 120);
      });

      connectors.forEach((connector, idx) => {
        tl.add(connector, {
          width: ["0%", "100%"],
          opacity: [0, 1],
          duration: 280,
          ease: "outExpo",
        }, idx * 160 + 60);
      });
    },
    {
      threshold: 0.2,
      onReducedMotion: (el) => {
        el.querySelectorAll<HTMLElement>(
          ".how-step-icon, .how-step-title, .how-step-body, .how-connector",
        ).forEach((target) => {
          target.style.opacity = "1";
          target.style.transform = "none";
        });

        el.querySelectorAll<HTMLElement>(".how-connector").forEach((connector) => {
          connector.style.width = "100%";
        });
      },
    },
  );

  return (
    <div ref={ref} className="landing-timeline landing-timeline--progress">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, idx) => (
          <article key={step.n} className="relative min-w-0 pr-0 lg:pr-8">
            {idx < STEPS.length - 1 ? (
              <div
                className="how-connector absolute left-11 top-[22px] hidden h-px bg-gradient-to-r from-lc-orange/70 to-lc-orange/5 lg:block"
                style={{
                  width: "0%",
                  opacity: 0,
                }}
                aria-hidden
              />
            ) : null}

            <div
              className="how-step-icon relative z-10 mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-lc-border bg-lc-surface"
              data-anime-target
              style={{ opacity: 0, transform: "scale(0.4)" }}
            >
              <span className="font-mono text-[13px] font-bold text-lc-orange">
                {step.n}
              </span>
            </div>

            <h3
              className="how-step-title mb-2 text-[15px] font-semibold text-lc-text"
              data-anime-target
              style={{ opacity: 0, transform: "translateY(8px)" }}
            >
              {step.title}
            </h3>
            {step.body ? (
              <p
                className="how-step-body max-w-[220px] text-[13px] leading-relaxed text-lc-muted"
                data-anime-target
                style={{ opacity: 0, transform: "translateY(8px)" }}
              >
                {step.body}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
