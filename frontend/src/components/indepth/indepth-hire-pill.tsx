"use client";

import type { HireSignal } from "@/lib/api";

const STYLES: Record<HireSignal, { label: string; className: string }> = {
  strong: { label: "Strong hire", className: "indepth-hire-pill--strong" },
  moderate: { label: "Moderate hire", className: "indepth-hire-pill--moderate" },
  weak: { label: "Weak hire", className: "indepth-hire-pill--weak" },
  pass: { label: "Pass", className: "indepth-hire-pill--pass" },
};

type Props = {
  signal: HireSignal;
  reasoning?: string;
};

export function InDepthHirePill({ signal, reasoning }: Props) {
  const s = STYLES[signal] ?? STYLES.moderate;
  return (
    <div className="indepth-hire-pill-wrap">
      <span className={`indepth-hire-pill ${s.className}`}>{s.label}</span>
      {reasoning ? <p className="indepth-hire-pill-reason">{reasoning}</p> : null}
    </div>
  );
}
