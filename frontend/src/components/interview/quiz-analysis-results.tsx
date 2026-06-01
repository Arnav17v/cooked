"use client";

import type { InterviewFirstQuestion, InterviewPerAnswerFeedback } from "@/lib/api";

import { QuizPrimaryButton } from "@/components/interview/quiz-ui";

type Signal = InterviewPerAnswerFeedback["signal"];

function normalizeSignal(raw: string | undefined): Signal {
  const s = (raw ?? "").toLowerCase();
  if (s === "green") return "green";
  if (s === "red") return "red";
  return "yellow";
}

function signalStyle(signal: Signal) {
  if (signal === "green") {
    return {
      label: "STRONG ANSWER",
      pill: "bg-[#00b8a3]/20 text-[#00b8a3] ring-1 ring-[#00b8a3]/35",
      quoteBox:
        "border-l-2 border-[#00b8a3]/70 bg-[#00b8a3]/12 text-lv-cream",
      quoteLabel: "text-[#00b8a3]",
      critiqueBox: "border border-[#00b8a3]/25 bg-[#00b8a3]/10",
      critiqueLabel: "text-[#00b8a3]",
      critiqueText: "text-lv-cream/85",
    };
  }
  if (signal === "red") {
    return {
      label: "THIN ANSWER",
      pill: "bg-[#ef4743]/20 text-[#ef4743] ring-1 ring-[#ef4743]/35",
      quoteBox:
        "border-l-2 border-[#ef4743]/70 bg-[#ef4743]/12 text-lv-cream",
      quoteLabel: "text-[#ef4743]",
      critiqueBox: "border border-[#ef4743]/25 bg-[#ef4743]/10",
      critiqueLabel: "text-[#ef4743]",
      critiqueText: "text-lv-cream/85",
    };
  }
  return {
    label: "MIXED ANSWER",
    pill: "bg-[#ffcc00]/20 text-[#ffcc00] ring-1 ring-[#ffcc00]/35",
    quoteBox:
      "border-l-2 border-[#ffcc00]/70 bg-[#ffcc00]/12 text-lv-cream",
    quoteLabel: "text-[#ffcc00]",
    critiqueBox: "border border-[#ffcc00]/25 bg-[#ffcc00]/10",
    critiqueLabel: "text-[#ffcc00]",
    critiqueText: "text-lv-cream/85",
  };
}

function sessionBadge(sessionId: string): string {
  const hex = sessionId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const tail = sessionId.replace(/-/g, "").slice(-2).toUpperCase() || "0";
  return `#${hex.slice(0, 3)}-X${tail}`;
}

function performanceHeadline(finalScore: number) {
  if (finalScore >= 70) {
    return { lead: "Your performance looks ", highlight: "strong." };
  }
  if (finalScore >= 50) {
    return { lead: "Your performance looks ", highlight: "fine." };
  }
  if (finalScore >= 35) {
    return { lead: "Your performance looks ", highlight: "mixed." };
  }
  return { lead: "Your performance needs ", highlight: "work." };
}

export type QuizAnalysisResultsProps = {
  sessionId: string;
  finalScore: number;
  headline: string;
  reportRows: InterviewPerAnswerFeedback[];
  questions: InterviewFirstQuestion[];
  answers: string[];
  submitError?: string | null;
  onBackToDashboard: () => void;
  onBackToPlan?: () => void;
  backToPlanLabel?: string;
};

export function QuizAnalysisResults({
  sessionId,
  finalScore,
  headline,
  reportRows,
  questions,
  answers,
  submitError,
  onBackToDashboard,
  onBackToPlan,
  backToPlanLabel = "Back to plan",
}: QuizAnalysisResultsProps) {
  const score = Math.min(100, Math.max(0, Math.round(finalScore)));
  const hero = performanceHeadline(score);
  const badge = sessionBadge(sessionId);

  return (
    <div className="relative text-lv-cream">
      {/* Watermark */}
      <p
        className="pointer-events-none absolute -left-1 top-0 z-0 select-none font-playfair text-[clamp(4.5rem,18vw,11rem)] font-normal leading-none tracking-tight text-lv-cream/[0.04]"
        aria-hidden
      >
        ANALYSIS
      </p>

      {/* Hero */}
      <header className="relative z-10 border-b border-lv-rule pb-10 pt-2 md:pb-14">
        <h1 className="max-w-3xl font-playfair text-[clamp(2rem,6vw,3.25rem)] font-normal leading-[1.12] tracking-tight text-lv-cream">
          {hero.lead}
          <span className="border-b-[6px] border-[#ff4d00] pb-0.5">{hero.highlight}</span>
        </h1>
        <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-lv-cream-dim sm:text-sm sm:leading-7">
          Answer each question in your own words. You get a brutally honest score, red flags, and
          per-answer breakdown based on your resume claims.
        </p>
      </header>

      {/* Score band */}
      <section className="relative z-10 border-b border-lv-rule py-10 md:py-12">
<div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12">
          <div>
            <p className="font-playfair text-[clamp(3.5rem,12vw,5.5rem)] font-normal leading-none tabular-nums text-[#ff4d00]">
              {score}
              <span className="ml-2 text-[clamp(1.25rem,4vw,2rem)] text-lv-cream/50">/ 100</span>
            </p>

            <p className="mt-8 font-jetbrains text-[11px] uppercase tracking-[0.2em] text-[#ff4d00]">
              Summary critique
            </p>
            <blockquote className="mt-3 max-w-xl font-playfair text-[clamp(1.1rem,2.5vw,1.45rem)] font-normal leading-snug text-lv-cream">
              &ldquo;{headline}&rdquo;
            </blockquote>
          </div>

          <div className="relative mx-auto w-full max-w-[280px] shrink-0 lg:mx-0">
            <div
              className="relative aspect-[4/3] overflow-hidden border border-lv-rule bg-gradient-to-br from-[#1a120e] via-lv-black to-lv-black"
              role="img"
              aria-label=""
            >

<div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(255,77,0,0.08) 18px, rgba(255,77,0,0.08) 19px)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-lv-black via-transparent to-transparent" />
              <p className="absolute bottom-3 right-3 font-jetbrains text-[11px] tracking-widest text-lv-cream/40">
                {badge}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Breakdown */}
      <section className="relative z-10 py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-jetbrains text-[11px] uppercase tracking-[0.2em] text-[#ff4d00]">
              Breakdown
            </p>
            <h2 className="mt-2 font-playfair text-[clamp(1.75rem,4vw,2.5rem)] font-normal text-lv-cream">
              Detailed evaluation
            </h2>
          </div>
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-lv-cream-dim">
            <span className="text-[#00b8a3]">Strong</span>
            <span className="mx-2 text-lv-cream/25">/</span>
            <span className="text-[#ffcc00]">Mixed</span>
            <span className="mx-2 text-lv-cream/25">/</span>
            <span className="text-[#ef4743]">Thin</span>
          </p>
        </div>

        <div className="mt-12 space-y-16 md:space-y-20">
          {reportRows.map((row, idx) => {
            const sig = normalizeSignal(row.signal);
            const style = signalStyle(sig);
            const q = questions[idx];
            const fullAnswer = (answers[idx] ?? "").trim();
            const quote =
              row.highlight_quote?.trim() || fullAnswer.slice(0, 280) || "No quote extracted.";
            const num = String(idx + 1).padStart(2, "0");
            const difficulty = (q?.difficulty ?? "Medium").toUpperCase();

            return (
              <article
                key={`analysis-q-${idx + 1}`}
                className="grid gap-8 border-t border-lv-rule pt-12 first:border-t-0 first:pt-0 lg:grid-cols-[4.5rem_1fr_minmax(240px,300px)] lg:gap-x-10"
              >
                <div className="flex flex-row gap-6 lg:flex-col lg:gap-4">
                  <p
                    className="font-playfair text-[clamp(3rem,8vw,4.5rem)] font-normal leading-none text-lv-cream/[0.12]"
                    aria-hidden
                  >
                    {num}
                  </p>
                  <div className="flex flex-col gap-2">
                    <span
                      className={`inline-flex w-fit px-2 py-1 font-jetbrains text-[9px] font-medium uppercase tracking-wider ${style.pill}`}
                    >
                      {style.label}
                    </span>
                    <p className="font-jetbrains text-[10px] uppercase tracking-widest text-lv-cream-dim">
                      Difficulty: {difficulty}
                    </p>
                  </div>
                </div>
<div className="min-w-0 space-y-6">
                  {q?.question ? (
                    <p className="font-playfair text-[clamp(1.05rem,2.2vw,1.35rem)] font-normal leading-snug text-lv-cream">
                      {q.question}
                    </p>
                  ) : null}

                  <div>
                    <p className="font-jetbrains text-[10px] uppercase tracking-widest text-lv-cream-dim">
                      Your response
                    </p>
                    <p className="mt-3 text-[14px] leading-relaxed text-lv-cream/90 sm:text-[15px] sm:leading-7">
                      {fullAnswer || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 lg:col-start-3">
                  <div className={`px-4 py-5 sm:px-5 sm:py-6 ${style.quoteBox}`}>
                    <p
                      className={`font-jetbrains text-[10px] font-medium uppercase tracking-widest ${style.quoteLabel}`}
                    >
                      Key quote
                    </p>
                    <p className="mt-3 font-playfair text-[15px] font-normal italic leading-snug sm:text-base">
                      &ldquo;{quote}&rdquo;
                    </p>
                  </div>

                  <div className={`rounded-sm px-4 py-4 sm:px-5 sm:py-5 ${style.critiqueBox}`}>
                    <p
                      className={`font-jetbrains text-[10px] uppercase tracking-widest ${style.critiqueLabel}`}
                    >
                      AI critique
                    </p>
                    <p
                      className={`mt-2 text-[13px] italic leading-relaxed sm:text-sm ${style.critiqueText}`}
                    >
                      {row.analysis?.trim() || "No critique returned for this answer."}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {submitError ? (
        <p className="mb-8 border border-[#ef4743]/40 bg-[#ef4743]/10 px-3 py-2 text-[13px] text-[#ef4743]" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <QuizPrimaryButton onClick={onBackToDashboard} className="min-w-[220px]">
          Back to dashboard
        </QuizPrimaryButton>
        {onBackToPlan ? (
          <button
            type="button"
            className="plan-link-btn border-none bg-transparent p-0 text-[13px]"
            onClick={onBackToPlan}
          >
            {backToPlanLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
