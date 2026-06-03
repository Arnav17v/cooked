import { SITE_URL } from "@/lib/site-url";

/** Score-tier meme assets in `public/score-memes/` (filenames must match). */

export type ScoreMemeTier = {
  id: string;
  min: number;
  max: number;
  src: string;
};

/** Ordered tiers — first match where `min <= score <= max` wins. */
export const SCORE_MEME_TIERS: ScoreMemeTier[] = [
  { id: "cooked0", min: 0, max: 15, src: "/score-memes/cooked0.png" },
  { id: "cooked1", min: 16, max: 29, src: "/score-memes/cooked1.gif" },
  { id: "cooked2", min: 30, max: 45, src: "/score-memes/cooked2gif.gif" },
  { id: "cooked3", min: 46, max: 55, src: "/score-memes/cooked3.png" },
  { id: "cooked4", min: 56, max: 74, src: "/score-memes/cooked4.gif" },
  { id: "cooked5", min: 75, max: 100, src: "/score-memes/cooked5.png" },
];

export function clampCookedScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function getScoreMemeTier(score: number): ScoreMemeTier {
  const s = clampCookedScore(score);
  return SCORE_MEME_TIERS.find((t) => s >= t.min && s <= t.max) ?? SCORE_MEME_TIERS[0];
}

export function getScoreMemeSrc(score: number): string {
  return getScoreMemeTier(score).src;
}

export function isScoreMemeAnimated(src: string): boolean {
  return src.toLowerCase().endsWith(".gif");
}

export function buildShareUrl(shareSlug: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : SITE_URL);
  return `${base.replace(/\/$/, "")}/share/${shareSlug}`;
}

export function buildShareCaption(opts: {
  score: number;
  heatLabel?: string | null;
  headline?: string | null;
  shareUrl: string;
}): string {
  const score = clampCookedScore(opts.score);
  const heat = (opts.heatLabel ?? "Cooked").trim();
  const line = opts.headline?.trim();
  const parts = [`My Resume Score: ${score}/100 (${heat}) on Am I Cooked?`];
  if (line) parts.push(`"${line}"`);
  parts.push(`See yours: ${opts.shareUrl}`);
  return parts.join(" ");
}

export function buildTwitterShareUrl(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function memeFilename(score: number, src: string): string {
  const ext = src.split(".").pop()?.split("?")[0] ?? "png";
  return `cooked-score-${score}.${ext}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function fetchScoreMemeBlob(score: number): Promise<{ blob: Blob; src: string }> {
  const src = getScoreMemeSrc(score);
  const res = await fetch(src);
  if (!res.ok) throw new Error("Could not load score image");
  const blob = await res.blob();
  return { blob, src };
}

export async function downloadScoreMeme(score: number): Promise<void> {
  const s = clampCookedScore(score);
  const { blob, src } = await fetchScoreMemeBlob(s);
  triggerBlobDownload(blob, memeFilename(s, src));
}

export async function shareScore(opts: {
  score: number;
  shareUrl: string;
  caption: string;
}): Promise<"shared" | "copied-link"> {
  const s = clampCookedScore(opts.score);
  const { blob, src } = await fetchScoreMemeBlob(s);
  const file = new File([blob], memeFilename(s, src), {
    type: blob.type || (isScoreMemeAnimated(src) ? "image/gif" : "image/png"),
  });

  if (typeof navigator !== "undefined" && navigator.share) {
    const withFiles: ShareData = {
      title: "My Resume Score",
      text: opts.caption,
      url: opts.shareUrl,
      files: [file],
    };
    if (navigator.canShare?.(withFiles)) {
      await navigator.share(withFiles);
      return "shared";
    }
    await navigator.share({
      title: "My Resume Score",
      text: opts.caption,
      url: opts.shareUrl,
    });
    return "shared";
  }

  await navigator.clipboard.writeText(opts.caption);
  return "copied-link";
}
