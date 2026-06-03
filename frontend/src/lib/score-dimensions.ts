/** Multi-dimensional Resume Score (D-019) — ATS 20, Content 40, Writing 10, Job Match 25. */

export type ScoreDimensionKey = "ats" | "content" | "writing" | "job_match" | "ready";

export type ScoreDimensionEntry = {
  score: number;
  max: number;
};

export type ScoreDimensionsPayload = {
  ats: ScoreDimensionEntry;
  content: ScoreDimensionEntry;
  writing: ScoreDimensionEntry;
  job_match: ScoreDimensionEntry;
  ready: ScoreDimensionEntry;
  total: number;
  total_max: number;
};

export const DIMENSION_LABELS: Record<ScoreDimensionKey, string> = {
  ats: "ATS",
  content: "Content",
  writing: "Writing",
  job_match: "Job Match",
  ready: "Ready",
};

/** UI order — Ready folded into Job Match (not shown). */
export const DIMENSION_ORDER: ScoreDimensionKey[] = [
  "ats",
  "content",
  "writing",
  "job_match",
];

export const DIMENSION_MAX: Record<Exclude<ScoreDimensionKey, "ready">, number> = {
  ats: 20,
  content: 40,
  writing: 10,
  job_match: 25,
};

const D019_MAX = { ats: 15, content: 45, writing: 10, job_match: 30 };

function emptyReady(): ScoreDimensionEntry {
  return { score: 0, max: 0 };
}

function scaleLegacy(score: number, oldMax: number, newMax: number): number {
  if (oldMax <= 0) return 0;
  return Math.max(0, Math.min(newMax, Math.round((score * newMax) / oldMax)));
}

function entryFromScore(key: Exclude<ScoreDimensionKey, "ready">, score: number): ScoreDimensionEntry {
  const max = DIMENSION_MAX[key];
  return { score: Math.max(0, Math.min(max, Math.round(score))), max };
}

function looksLikeD019(raw: Record<string, unknown>): boolean {
  if ("ready" in raw) return false;
  const ats = Number(raw.ats) || 0;
  const content = Number(raw.content) || 0;
  const jobMatch = Number(raw.job_match) || 0;
  return ats <= D019_MAX.ats && content <= D019_MAX.content && jobMatch <= D019_MAX.job_match;
}

function migrateD019(raw: Record<string, unknown>): Record<ScoreDimensionKey, ScoreDimensionEntry> {
  return {
    ats: entryFromScore("ats", scaleLegacy(Number(raw.ats) || 0, D019_MAX.ats, DIMENSION_MAX.ats)),
    content: entryFromScore(
      "content",
      scaleLegacy(Number(raw.content) || 0, D019_MAX.content, DIMENSION_MAX.content),
    ),
    writing: entryFromScore(
      "writing",
      scaleLegacy(Number(raw.writing) || 0, D019_MAX.writing, DIMENSION_MAX.writing),
    ),
    job_match: entryFromScore(
      "job_match",
      scaleLegacy(Number(raw.job_match) || 0, D019_MAX.job_match, DIMENSION_MAX.job_match),
    ),
    ready: emptyReady(),
  };
}

function migrateLegacyFive(raw: Record<string, unknown>): Record<ScoreDimensionKey, ScoreDimensionEntry> {
  const jobMatch = (Number(raw.job_match) || 0) + (Number(raw.ready) || 0);
  return {
    ats: entryFromScore("ats", Number(raw.ats) || 0),
    content: entryFromScore("content", Number(raw.content) || 0),
    writing: entryFromScore("writing", Number(raw.writing) || 0),
    job_match: entryFromScore("job_match", jobMatch),
    ready: emptyReady(),
  };
}

function readScore(key: ScoreDimensionKey, raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (raw && typeof raw === "object" && "score" in raw) {
    return Number((raw as { score: number }).score) || 0;
  }
  return 0;
}

function payloadFromApi(payload: ScoreDimensionsPayload): ScoreDimensionsPayload | null {
  if (!payload?.ats || typeof payload.ats.score !== "number") return null;
  const dims = {
    ats: {
      score: payload.ats.score,
      max: payload.ats.max ?? DIMENSION_MAX.ats,
    },
    content: {
      score: payload.content.score,
      max: payload.content.max ?? DIMENSION_MAX.content,
    },
    writing: {
      score: payload.writing.score,
      max: payload.writing.max ?? DIMENSION_MAX.writing,
    },
    job_match: {
      score: payload.job_match.score,
      max: payload.job_match.max ?? DIMENSION_MAX.job_match,
    },
    ready: payload.ready?.max ? payload.ready : emptyReady(),
  };
  const total = DIMENSION_ORDER.reduce((n, k) => n + dims[k].score, 0);
  if (total <= 0) return null;
  return {
    ...dims,
    total: payload.total > 0 ? payload.total : total,
    total_max: payload.total_max ?? 100,
  };
}

function fromBreakdownRaw(bd: Record<string, unknown> | undefined): ScoreDimensionsPayload | null {
  const raw = bd?.score_dimensions;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if ("ready" in r) {
    const migrated = migrateLegacyFive(r);
    const total = DIMENSION_ORDER.reduce((n, k) => n + migrated[k].score, 0);
    if (total <= 0) return null;
    return { ...migrated, total, total_max: 100 };
  }

  if (looksLikeD019(r)) {
    const migrated = migrateD019(r);
    const total = DIMENSION_ORDER.reduce((n, k) => n + migrated[k].score, 0);
    if (total > 0) return { ...migrated, total, total_max: 100 };
  }

  const migrated = {
    ats: entryFromScore("ats", readScore("ats", r.ats)),
    content: entryFromScore("content", readScore("content", r.content)),
    writing: entryFromScore("writing", readScore("writing", r.writing)),
    job_match: entryFromScore("job_match", readScore("job_match", r.job_match)),
    ready: emptyReady(),
  };
  const total = DIMENSION_ORDER.reduce((n, k) => n + migrated[k].score, 0);
  if (total <= 0) return null;
  return { ...migrated, total, total_max: 100 };
}

function deriveFromTotal(total: number): ScoreDimensionsPayload {
  const s = Math.max(0, Math.min(100, Math.round(total)));
  const ratios = [20, 40, 10, 25];
  const raw = ratios.map((r) => (s * r) / 100);
  const ints = raw.map((x) => Math.floor(x));
  let remainder = s - ints.reduce((a, b) => a + b, 0);
  ints[1] = Math.min(DIMENSION_MAX.content, ints[1] + remainder);
  remainder = s - ints.reduce((a, b) => a + b, 0);
  if (remainder > 0) ints[3] = Math.min(DIMENSION_MAX.job_match, ints[3] + remainder);
  remainder = s - ints.reduce((a, b) => a + b, 0);
  if (remainder > 0) ints[0] = Math.min(DIMENSION_MAX.ats, ints[0] + remainder);
  const keys: Array<Exclude<ScoreDimensionKey, "ready">> = ["ats", "content", "writing", "job_match"];
  const dims = {} as Record<ScoreDimensionKey, ScoreDimensionEntry>;
  keys.forEach((k, i) => {
    dims[k] = { score: ints[i], max: DIMENSION_MAX[k] };
  });
  dims.ready = emptyReady();
  const sum = DIMENSION_ORDER.reduce((n, k) => n + dims[k].score, 0);
  return { ...dims, total: sum, total_max: 100 };
}

export function resolveScoreDimensions(
  payload: ScoreDimensionsPayload | undefined,
  scoreBreakdown: Record<string, unknown> | undefined,
  fallbackTotal: number | null | undefined,
): ScoreDimensionsPayload {
  const fromApi = payload ? payloadFromApi(payload) : null;
  if (fromApi) return fromApi;

  const fromBd = fromBreakdownRaw(scoreBreakdown);
  if (fromBd) return fromBd;

  const total =
    fallbackTotal !== null && fallbackTotal !== undefined ? Math.round(fallbackTotal) : 0;
  return deriveFromTotal(total);
}

export function dimensionPct(entry: ScoreDimensionEntry): number {
  if (!entry.max) return 0;
  return Math.round((100 * entry.score) / entry.max);
}

/** Sample dimensions for landing demo */
export const SAMPLE_SCORE_DIMENSIONS: ScoreDimensionsPayload = {
  ats: { score: 14, max: 20 },
  content: { score: 30, max: 40 },
  writing: { score: 7, max: 10 },
  job_match: { score: 18, max: 25 },
  ready: { score: 0, max: 0 },
  total: 69,
  total_max: 100,
};
