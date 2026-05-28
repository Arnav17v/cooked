/** Parse `interview_quiz_scores` from `ScoreResponse`. */

import type { QuizScoreHistoryEntry } from "./api";

export type StoredQuizScore = QuizScoreHistoryEntry;

export function parseInterviewQuizScores(raw: unknown): StoredQuizScore[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredQuizScore[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const score = Number(o.final_score);
    const at = typeof o.at === "string" ? o.at.trim() : "";
    const sessionId = typeof o.session_id === "string" ? o.session_id.trim() : "";
    if (!Number.isFinite(score) || !at) continue;
    const entry: StoredQuizScore = {
      final_score: Math.round(Math.max(0, Math.min(100, score))),
      at,
    };
    if (sessionId) entry.session_id = sessionId;
    out.push(entry);
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
