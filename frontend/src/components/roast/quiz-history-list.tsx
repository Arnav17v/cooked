"use client";

import type { QuizHistorySessionItem } from "@/lib/api";
import { openQuizResultsInNewTab } from "@/lib/open-quiz-results-tab";
import { scoreHeatColor } from "@/components/score/ScoreCard";
import { normalizeHeatLabel } from "@/components/roast/roast-shared";

function formatQuizDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

type Props = {
  sessions: QuizHistorySessionItem[];
  loading?: boolean;
};

export function QuizHistoryList({ sessions, loading }: Props) {
  if (loading) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-wide text-lc-dim">
        {"// loading past quizzes…"}
      </p>
    );
  }

  if (sessions.length === 0) {
    return null;
  }

  function openSession(sessionId: string, hasFull: boolean) {
    if (!hasFull || typeof window === "undefined") return;
    openQuizResultsInNewTab(window.location.origin, sessionId, (path) => {
      window.location.assign(path);
    });
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-lc-dim">
        {"// past quizzes"}
      </p>
      <ul className="divide-y divide-lc-divider rounded-lg border border-lc-border bg-lc-surface/60">
        {sessions.map((s) => {
          const heat = normalizeHeatLabel(s.heat_label);
          const color = scoreHeatColor(heat);
          const clickable = s.has_full_results;
          return (
            <li key={s.session_id}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => openSession(s.session_id, clickable)}
                className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  clickable
                    ? "hover:bg-lc-elevated cursor-pointer"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="tabular-nums text-[18px] font-semibold" style={{ color }}>
                    {s.final_score}
                    <span className="text-[12px] font-normal text-lc-dim"> / 100</span>
                  </span>
                  <span className="ml-2 text-[11px] font-medium" style={{ color }}>
                    {heat}
                  </span>
                  {s.one_liner ? (
                    <p className="mt-1 line-clamp-2 text-[12px] italic text-lc-muted">
                      &ldquo;{s.one_liner}&rdquo;
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right font-mono text-[10px] text-lc-dim">
                  <p>{formatQuizDate(s.completed_at)}</p>
                  <p className="mt-0.5">
                    {s.question_count > 0 ? `${s.question_count} Q` : "quiz"}
                    {clickable ? " · view analysis →" : " · summary only"}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
