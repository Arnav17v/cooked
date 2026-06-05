"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

const RAIL_EASE = [0.25, 1, 0.5, 1] as const;

type Props = {
  href: string;
};

export function PrepPlanStartLink({ href }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const showFill = reduce || inView;

  return (
    <div ref={ref} className="dash-prep-plan-cta">
      <div className="dash-prep-plan-rail" aria-hidden>
        <div className="dash-prep-plan-rail-bg" />
        <motion.div
          className="dash-prep-plan-rail-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: showFill ? 1 : 0 }}
          transition={{ duration: 0.75, ease: RAIL_EASE }}
          style={{ transformOrigin: "left center" }}
        />
      </div>
      <Link href={href} className="dash-prep-plan-link">
        Start prep plan →
      </Link>
    </div>
  );
}
