/** Parse `interview_quiz_scores` from `ScoreResponse`. */

import type { QuizScoreHistoryEntry } from "./api";

export type StoredQuizScore = QuizScoreHistoryEntry;

export function parseInterviewQuizScores(raw: unknown): StoredQuizScore[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredQuizScore[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const score = Number(o.final_score);
    const at = typeof o.at === "string" ? o.at.trim() : "";
    if (!Number.isFinite(score) || !at) continue;
    out.push({ final_score: Math.round(Math.max(0, Math.min(100, score))), at });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
