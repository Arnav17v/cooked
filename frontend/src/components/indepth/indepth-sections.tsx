"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

import type { InDepthAnalysis } from "@/lib/api";
import { EASE_DEFAULT } from "@/lib/motion-easing";
import { InDepthInterviewForecast } from "@/components/indepth/indepth-interview-forecast";
import { InDepthRewriteDiff } from "@/components/indepth/indepth-rewrite-diff";

type SectionId = "market" | "hm" | "forecast" | "gap" | "rewrite" | "plan";

type Props = {
  data: InDepthAnalysis;
};

export function InDepthSections({ data }: Props) {
  const [openId, setOpenId] = useState<SectionId>("market");

  const sections: { id: SectionId; title: string; body: ReactNode }[] = [
    {
      id: "market",
      title: "Market positioning",
      body: (
        <>
          <p className="indepth-percentile-label">{data.market_positioning.percentile_label}</p>
          <div
            className="indepth-percentile-bar"
            role="progressbar"
            aria-valuenow={data.market_positioning.percentile}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              className="indepth-percentile-fill"
              initial={{ width: 0 }}
              animate={{ width: `${data.market_positioning.percentile}%` }}
              transition={{ duration: 0.6, ease: EASE_DEFAULT }}
            />
          </div>
          <p className="indepth-body-text">{data.market_positioning.positioning_summary}</p>
          <p className="indepth-ceiling">
            <span className="indepth-ceiling-label">Ceiling →</span> {data.market_positioning.ceiling}
          </p>
        </>
      ),
    },
    {
      id: "hm",
      title: "Hiring manager read",
      body: (
        <>
          <p className="indepth-first-impression">{data.hiring_manager_read.first_impression}</p>
          <blockquote className="indepth-monologue">{data.hiring_manager_read.inner_monologue}</blockquote>
        </>
      ),
    },
    {
      id: "forecast",
      title: "Interview forecast",
      body: <InDepthInterviewForecast items={data.interview_forecast} />,
    },
    {
      id: "gap",
      title: "Competitive gap",
      body: (
        <dl className="indepth-gap-rows">
          <div>
            <dt>vs top 10%</dt>
            <dd>{data.competitive_gap.vs_top_10_percent}</dd>
          </div>
          <div>
            <dt>Quickest to close (30 days)</dt>
            <dd>{data.competitive_gap.quickest_gap_to_close}</dd>
          </div>
          <div>
            <dt>Hardest to close (6+ mo)</dt>
            <dd>{data.competitive_gap.hardest_gap_to_close}</dd>
          </div>
        </dl>
      ),
    },
    {
      id: "rewrite",
      title: "The one rewrite that matters most",
      body: (
        <InDepthRewriteDiff
          original={data.highest_leverage_rewrite.original}
          rewritten={data.highest_leverage_rewrite.rewritten}
          why={data.highest_leverage_rewrite.why_this_one}
        />
      ),
    },
    {
      id: "plan",
      title: "30-day action plan",
      body: (
        <>
          <ol className="indepth-plan-timeline">
            {(
              [
                ["Week 1", data.thirty_day_plan.week_1],
                ["Week 2", data.thirty_day_plan.week_2],
                ["Week 3", data.thirty_day_plan.week_3],
                ["Week 4", data.thirty_day_plan.week_4],
              ] as const
            ).map(([label, text]) => (
              <li key={label}>
                <span className="indepth-plan-week">{label}</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <p className="indepth-north-star">
            <span className="indepth-north-star-label">North star</span>
            {data.thirty_day_plan.north_star}
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="indepth-sections">
      {sections.map((sec, idx) => {
        const open = openId === sec.id;
        return (
          <div
            key={sec.id}
            className={`indepth-section-card${open ? " indepth-section-card--open" : ""}`}
          >
            <button
              type="button"
              className="indepth-section-header"
              aria-expanded={open}
              onClick={() => setOpenId(sec.id)}
            >
              <span className="indepth-section-num">{idx + 1}</span>
              <span className="indepth-section-title">{sec.title}</span>
              <span className="indepth-section-chevron" aria-hidden>
                {open ? "−" : "+"}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  key="body"
                  className="indepth-section-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: EASE_DEFAULT }}
                >
                  <div className="indepth-section-body-inner">{sec.body}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
