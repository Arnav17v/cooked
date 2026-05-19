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

/** Sent with upload — calibrates roast, notes, and quiz difficulty. */
export const EXPERIENCE_LEVEL_OPTIONS = [
  {
    value: "student",
    label: "Student / intern",
    hint: "Still in school or pre–first job",
  },
  {
    value: "fresher",
    label: "Fresher (0–1 yr)",
    hint: "New grad or first role",
  },
  {
    value: "early",
    label: "Early career (1–3 yr)",
    hint: "Some full-time experience",
  },
  {
    value: "mid",
    label: "Mid-level (3–6 yr)",
    hint: "Solid ownership expected",
  },
  {
    value: "senior",
    label: "Senior (6+ yr)",
    hint: "Scope and impact expected",
  },
  {
    value: "career_switch",
    label: "Career switcher",
    hint: "Moving into this field",
  },
] as const;

export type ExperienceLevelId = (typeof EXPERIENCE_LEVEL_OPTIONS)[number]["value"];

export const STAGE_LINES: Record<string, string> = {
  extracting: "→ extracting…",
  scoring: "→ scoring…",
  flagging: "→ flagging weak bullets…",
  questions: "→ generating interview questions…",
};

/** Approximate roast.log progress % after each pipeline step (SSE). */
export const ROAST_STEP_PROGRESS: Record<string, number> = {
  extracting: 32,
  scoring: 55,
  flagging: 72,
  questions: 88,
};

/** Browser hint for anonymous refresh; signed-in saves use `/me/roasts` + Bearer. */
export const LAST_RESUME_LS = "cooked_last_resume_v1";

const ROAST_FAILURE_EXACT: Record<string, string> = {
  models_unavailable:
    "We're getting a lot of traffic right now. Please wait about 5 minutes and try again.",
  too_short:
    "Your resume looks too short to roast. Add more detail, or use Paste text and paste your full resume.",
  no_resume_text:
    "We couldn't read your resume. Try uploading again, or switch to Paste text and paste the full content.",
  no_user: "Something went wrong with your session. Refresh the page and try again.",
  not_found: "That roast couldn't be found. Start a new upload and try again.",
  analysis_failed: "The roast didn't finish. Please try again in a few minutes.",
  unknown: "Something went wrong. Please try again in a few minutes.",
  quota_exceeded:
    "You've hit today's roast limit (3 per day). Come back tomorrow for another run.",
  invalid_experience_level: "Pick an experience level from the dropdown and try again.",
  sse_connection_dropped:
    "Connection lost while roasting. Check your internet and try again.",
};

function extractApiErrorDetail(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { detail?: unknown };
      if (typeof parsed.detail === "string") return parsed.detail;
      if (Array.isArray(parsed.detail)) {
        return parsed.detail
          .map((item) =>
            typeof item === "object" && item !== null && "msg" in item
              ? String((item as { msg?: string }).msg)
              : String(item),
          )
          .join(" ");
      }
    } catch {
      /* plain text */
    }
  }
  return trimmed;
}

/** Map backend / network errors to copy for roast.log and inline alerts. */
export function formatRoastFailure(raw: string): string {
  const detail = extractApiErrorDetail(raw);
  const key = detail.toLowerCase().replace(/\s+/g, "_");

  if (ROAST_FAILURE_EXACT[key]) return ROAST_FAILURE_EXACT[key];

  const hay = detail.toLowerCase();

  if (/daily roast limit|429|too many requests|rate.?limit/.test(hay)) {
    return ROAST_FAILURE_EXACT.quota_exceeded;
  }
  if (/too short/.test(hay)) {
    return ROAST_FAILURE_EXACT.too_short;
  }
  if (
    /bucket|storage|credentials|r2\b|s3\b|encryption|could not store|incompletebody|put_object|nosuchbucket|accessdenied/.test(
      hay,
    )
  ) {
    return "We couldn't process that PDF. Switch to Paste text at the top and paste your resume content instead.";
  }
  if (
    /only pdf|pdf uploads require|could not read|parse|extract|corrupt|invalid pdf|unreadable|scanned/.test(
      hay,
    )
  ) {
    return "We couldn't read that PDF. Try another file, or use Paste text and paste your resume instead.";
  }
  if (/provide resume_text|resume text is empty|expired or not uploaded/.test(hay)) {
    return ROAST_FAILURE_EXACT.no_resume_text;
  }
  if (/sse connection|connection dropped|failed to fetch|network error|load failed/.test(hay)) {
    return ROAST_FAILURE_EXACT.sse_connection_dropped;
  }
  if (/target_role|experience_level|invalid experience/.test(hay)) {
    return "Fill in your target role and experience level, then try again.";
  }
  if (/413|too large|entity too large/.test(hay)) {
    return "That PDF is too large. Use a shorter file, or switch to Paste text instead.";
  }
  if (/503|service unavailable|bad gateway|gateway timeout|502|504/.test(hay)) {
    return "Our servers are busy or waking up. Wait about a minute and try again.";
  }
  if (/401|403|unauthorized|forbidden/.test(hay)) {
    return "You may need to sign in again. Refresh the page and try once more.";
  }
  if (/404|not found/.test(hay)) {
    return ROAST_FAILURE_EXACT.not_found;
  }

  if (/model|llm|provider|gemini|groq|openai|anthropic/.test(hay)) {
    return ROAST_FAILURE_EXACT.models_unavailable;
  }

  return "Something went wrong on our end. Try again in a few minutes — or use Paste text if PDF upload keeps failing.";
}

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
