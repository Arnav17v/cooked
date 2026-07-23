"use client";

import { animate } from "animejs";
import { Lock, Shield, Sparkles, ChevronDown } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useReducedMotion } from "motion/react";

import { LandingReveal } from "@/components/landing/landing-reveal";
import { useAnimeOnScroll } from "@/lib/use-anime-on-scroll";

type FaqItem = { question: string; answer: string };

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is this just another generic ChatGPT wrapper?",
    answer:
      "No. While we route requests to Google Gemini for resume parsing and analysis, the intelligence lies in our structure. We extract details from your resume bullets, evaluate them against a structured rubric across four key dimensions (ATS, Content, Writing, Job Match), and map specific gaps to concrete talking points, rewrite targets, and a day-by-day study timeline.",
  },
  {
    question: "Is my resume kept private and secure?",
    answer:
      "Yes, completely. Your resume text, parsed data, and final dashboard analyses are stored securely under your Clerk account. The public share page (/share/[slug]) displays a preview of your score and bullet insights but never exposes your raw resume file, full text, or personal contact info.",
  },
  {
    question: "What exactly does the Resume Score measure?",
    answer:
      "We score your resume out of 100 based on: ATS compatibility (0-20), Content quality and metrics (0-40), Writing clarity (0-10), and Job Match alignment with your target role (0-25). This ensures you get a realistic view of how recruiters and automated screeners will evaluate you.",
  },
  {
    question: "Can I use this completely for free?",
    answer:
      "Yes. Our Version 1 is built entirely on free-tier APIs, meaning you pay nothing. To support this free tier sustainably, we limit each account to 3 full diagnostic analyses per day, which resets daily.",
  },
];

function FaqItem({ item, idx }: { item: FaqItem; idx: number }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const prevOpen = useRef(open);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    if (reduce) {
      el.style.height = open ? "auto" : "0px";
      el.style.opacity = open ? "1" : "0";
      el.style.overflow = open ? "visible" : "hidden";
      prevOpen.current = open;
      return;
    }

    if (open && !prevOpen.current) {
      el.style.height = "0px";
      el.style.overflow = "hidden";
      const target = el.scrollHeight;

      animate(el, {
        height: [`0px`, `${target}px`],
        opacity: [0, 1],
        duration: 380,
        ease: "spring(1, 80, 12, 0)",
        onComplete: () => {
          el.style.height = "auto";
          el.style.overflow = "visible";
        },
      });
    } else if (!open && prevOpen.current) {
      const current = el.scrollHeight;
      el.style.height = `${current}px`;
      el.style.overflow = "hidden";

      animate(el, {
        height: [`${current}px`, `0px`],
        opacity: [1, 0],
        duration: 260,
        ease: "outExpo",
      });
    }

    prevOpen.current = open;
  }, [open, reduce]);

  return (
    <div className="bg-lc-surface border border-lc-border rounded-lg overflow-hidden">
      <button
        type="button"
        id={`faq-btn-${idx}`}
        aria-expanded={open}
        aria-controls={`faq-body-${idx}`}
        className="w-full flex items-center justify-between p-5 text-left font-medium text-[14px] text-lc-text focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-orange/50"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => {
          if (reduce) return;
          animate(e.currentTarget, {
            backgroundColor: "rgba(255,161,22,0.04)",
            duration: 180,
          });
        }}
        onMouseLeave={(e) => {
          if (reduce) return;
          animate(e.currentTarget, {
            backgroundColor: "rgba(0,0,0,0)",
            duration: 250,
          });
        }}
      >
        <span>{item.question}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 ml-4 transition-transform duration-300 ${
            open ? "rotate-180 text-lc-orange" : "text-lc-dim"
          }`}
        />
      </button>

      <div
        ref={bodyRef}
        id={`faq-body-${idx}`}
        role="region"
        aria-labelledby={`faq-btn-${idx}`}
        style={{ height: 0, overflow: "hidden", opacity: 0 }}
      >
        <div className="px-5 pb-5 text-[13px] text-lc-muted leading-relaxed border-t border-lc-divider pt-3 bg-lc-bg/30">
          {item.answer}
        </div>
      </div>
    </div>
  );
}

const STATS = [
  { value: 3, suffix: "", label: "Free analyses per day", color: "#ffa116" },
  { value: 4, suffix: "", label: "Score dimensions graded", color: "#00b8a3" },
  { value: 100, suffix: "%", label: "Free. No credit card", color: "#ffa116" },
];

function AnimatedStats() {
  const ref = useAnimeOnScroll(
    (tl, el) => {
      const counters = el.querySelectorAll<HTMLElement>(".trust-stat-val");
      counters.forEach((counter, idx) => {
        const target = parseInt(counter.dataset.target ?? "0");
        const obj = { val: 0 };
        tl.add(obj, {
          val: target,
          duration: 1100,
          ease: "outExpo",
          onUpdate: () => {
            counter.textContent = String(Math.round(obj.val));
          },
        }, idx * 180);
      });
    },
    {
      threshold: 0.5,
      onReducedMotion: (el) => {
        el.querySelectorAll<HTMLElement>(".trust-stat-val").forEach((counter) => {
          counter.textContent = counter.dataset.target ?? counter.textContent;
        });
      },
    },
  );

  return (
    <div ref={ref} className="grid grid-cols-3 gap-4 mt-8">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="text-center bg-lc-surface border border-lc-border rounded-lg px-3 py-5"
        >
          <p
            className="font-mono text-3xl font-bold"
            style={{ color: stat.color }}
          >
            <span
              className="trust-stat-val"
              data-anime-target
              data-target={String(stat.value)}
            >
              0
            </span>
            {stat.suffix}
          </p>
          <p className="text-[11px] text-lc-muted mt-1 leading-snug">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function LandingTrustFaq() {
  return (
    <section className="py-24 border-t border-lc-border" id="faq">
      <div className="landing-page">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-24">
          <LandingReveal className="lg:col-span-1">
            <p className="font-mono text-[12px] uppercase tracking-wider text-lc-orange mb-3">
              {"// data handling"}
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-lc-text">
              Your resume, <br />
              <span className="text-lc-orange">your data.</span>
            </h2>
            <p className="mt-4 text-lc-muted text-sm leading-relaxed">
              We build tools for developers, which means we respect your privacy. No
              hidden data brokers, no lock-in.
            </p>
            <AnimatedStats />
          </LandingReveal>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <LandingReveal delay={0.1}>
              <div className="bg-lc-surface border border-lc-border rounded-lg p-5 h-full">
                <Shield className="w-6 h-6 text-lc-orange mb-4" />
                <h4 className="font-semibold text-lc-text text-[14px] mb-2">Gemini Processing</h4>
                <p className="text-lc-muted text-[12px] leading-relaxed">
                  Your resume text is parsed and evaluated via Google Generative Language API.
                  No data is used to train public LLM models.
                </p>
              </div>
            </LandingReveal>

            <LandingReveal delay={0.2}>
              <div className="bg-lc-surface border border-lc-border rounded-lg p-5 h-full">
                <Lock className="w-6 h-6 text-lc-orange mb-4" />
                <h4 className="font-semibold text-lc-text text-[14px] mb-2">Retention Control</h4>
                <p className="text-lc-muted text-[12px] leading-relaxed">
                  We save your diagnostic analysis and score report, but you can opt to scrub your
                  raw resume text from our database at any time.
                </p>
              </div>
            </LandingReveal>

            <LandingReveal delay={0.3}>
              <div className="bg-lc-surface border border-lc-border rounded-lg p-5 h-full">
                <Sparkles className="w-6 h-6 text-lc-orange mb-4" />
                <h4 className="font-semibold text-lc-text text-[14px] mb-2">3 Free / Day</h4>
                <p className="text-lc-muted text-[12px] leading-relaxed">
                  We use free model endpoints to keep the service free. To support this cost profile,
                  users get up to 3 diagnostic runs per day.
                </p>
              </div>
            </LandingReveal>
          </div>
        </div>

        <div className="border-t border-lc-divider pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <LandingReveal className="lg:col-span-1">
              <p className="font-mono text-[12px] uppercase tracking-wider text-lc-orange mb-3">
                {"// questions"}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-lc-text">
                Frequently <br />
                <span className="text-lc-orange">Asked.</span>
              </h2>
            </LandingReveal>

            <div className="lg:col-span-2 space-y-4">
              {FAQ_ITEMS.map((item, idx) => (
                <FaqItem key={idx} item={item} idx={idx} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
