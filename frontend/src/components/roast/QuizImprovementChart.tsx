"use client";

import type { StoredQuizScore } from "@/lib/interview-quiz-scores";

type Props = {
  scores: StoredQuizScore[];
};

/** Simple 0–100 score trend; no external chart deps. */
export function QuizImprovementChart({ scores }: Props) {
  if (scores.length === 0) return null;

  const maxPlot = 40;
  const plotScores = scores.length > maxPlot ? scores.slice(-maxPlot) : scores;
  const truncated = scores.length > maxPlot;
  const w = 320;
  const h = 140;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const n = plotScores.length;
  const xs = plotScores.map((_, i) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1)));
  const ys = plotScores.map((s) => padT + innerH * (1 - s.final_score / 100));

  const lineD =
    n === 1
      ? `M ${xs[0]!} ${ys[0]!}`
      : plotScores
          .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]!.toFixed(1)} ${ys[i]!.toFixed(1)}`)
          .join(" ");

  const first = plotScores[0]!.final_score;
  const last = plotScores[n - 1]!.final_score;
  const delta = last - first;

  return (
    <div className="rounded-xl border border-lc-border bg-lc-header/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-lc-dim">
          Quiz score trend
        </h4>
        {n >= 2 ? (
          <span
            className={`font-mono text-[11px] tabular-nums ${
              delta > 0 ? "text-lc-easy" : delta < 0 ? "text-lc-hard" : "text-lc-muted"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta} vs first attempt
          </span>
        ) : (
          <span className="font-mono text-[11px] text-lc-dim">1 attempt</span>
        )}
      </div>
      <p className="mt-1 text-[12px] text-lc-muted">
        Saved on this resume in your account. Each point is one finished mock quiz.
        {truncated ? ` Chart shows the most recent ${maxPlot} attempts.` : ""}
      </p>

      <svg
        className="mt-4 w-full max-w-full text-lc-orange"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Quiz scores over ${scores.length} attempts`}
      >
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + innerH}
          className="stroke-lc-border"
          strokeWidth={1}
        />
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          className="stroke-lc-border"
          strokeWidth={1}
        />
        <text x={4} y={padT + 4} className="fill-lc-dim font-mono text-[9px]">
          100
        </text>
        <text x={8} y={padT + innerH} className="fill-lc-dim font-mono text-[9px]">
          0
        </text>

        <path d={lineD} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {plotScores.map((s, i) => (
          <g key={`${s.at}-${i}`}>
            <circle cx={xs[i]!} cy={ys[i]!} r={4} className="fill-lc-bg stroke-lc-orange" strokeWidth={2} />
            <text
              x={xs[i]!}
              y={h - 6}
              textAnchor="middle"
              className="fill-lc-muted font-mono text-[9px]"
            >
              {truncated ? scores.length - plotScores.length + i + 1 : i + 1}
            </text>
          </g>
        ))}
      </svg>

      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto font-mono text-[10px] text-lc-dim">
        {scores
          .map((s, i) => ({ s, i }))
          .reverse()
          .map(({ s, i }) => (
            <li key={`${s.at}-${i}`} className="flex justify-between gap-3 border-l border-lc-border pl-2">
              <span className="shrink-0 text-lc-muted">#{i + 1}</span>
              <span className="shrink-0 text-lc-orange tabular-nums">{s.final_score}</span>
              <span className="min-w-0 truncate text-right">{new Date(s.at).toLocaleString()}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
