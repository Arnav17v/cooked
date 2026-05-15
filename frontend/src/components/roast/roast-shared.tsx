"use client";

import type { RedFlagStructured } from "@/lib/api";

/** Optional ``<datalist>`` hints for the target-role field (users may type anything). */
export const TARGET_ROLE_SUGGESTIONS = [
  "Software developer",
  "Software engineer",
  "Frontend engineer",
  "Backend engineer",
  "Full stack developer",
  "Data analyst",
  "Data scientist",
  "Product manager",
  "Marketing lead",
  "UX designer",
  "DevOps engineer",
  "Machine learning engineer",
  "Solutions engineer",
  "Technical program manager",
] as const;

/** Placeholder + hint line for the free-text target role input. */
export const TARGET_ROLE_PLACEHOLDER =
  "e.g. Software developer, Marketing lead, PM intern…";

export const STAGE_LINES: Record<string, string> = {
  extracting: "→ extracting…",
  scoring: "→ scoring…",
  flagging: "→ flagging weak bullets…",
  questions: "→ generating interview questions…",
};

/** Browser hint for anonymous refresh; signed-in saves use `/me/roasts` + Bearer. */
export const LAST_RESUME_LS = "cooked_last_resume_v1";

export function isUuidShape(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim(),
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function normalizeHeatLabel(label: string | null | undefined): string {
  const lower = (label ?? "Medium").trim().toLowerCase();
  const map: Record<string, string> = {
    easy: "Raw",
    raw: "Raw",
    medium: "Medium",
    hard: "Hard",
    cooked: "Cooked",
  };
  const v = map[lower] ?? "Medium";
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

export function isStructuredFlag(v: unknown): v is RedFlagStructured {
  return (
    typeof v === "object" &&
    v !== null &&
    "issue" in v &&
    "suggested_rewrite" in v &&
    typeof (v as RedFlagStructured).issue === "string"
  );
}

export function parseSectionVerdicts(
  bd: Record<string, unknown> | undefined,
): { section: string; verdict: string }[] {
  const raw = bd?.section_verdicts;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const labels: Record<string, string> = {
      experience: "Experience",
      projects: "Projects",
      skills: "Skills",
      education: "Education",
      summary: "Summary",
    };
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => ({
        section: labels[k] ?? k.charAt(0).toUpperCase() + k.slice(1),
        verdict: String(v),
      }));
  }
  const arr = raw;
  if (!Array.isArray(arr)) return [];
  const out: { section: string; verdict: string }[] = [];
  for (const row of arr) {
    if (
      typeof row === "object" &&
      row !== null &&
      "section" in row &&
      "verdict" in row &&
      typeof (row as { section: unknown }).section === "string" &&
      typeof (row as { verdict: unknown }).verdict === "string"
    ) {
      out.push({
        section: (row as { section: string }).section,
        verdict: (row as { verdict: string }).verdict,
      });
    }
  }
  return out;
}

export type ResultTabId = "score" | "flags" | "questions" | "notes";

export function QuestionDifficultyPill({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Easy: "text-[#00b8a3] bg-[#00b8a3]/10",
    Medium: "text-[#ffc01e] bg-[#ffc01e]/10",
    Hard: "text-[#ef4743] bg-[#ef4743]/10",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        styles[level] ?? "text-lc-muted bg-white/5"
      }`}
    >
      {level}
    </span>
  );
}
