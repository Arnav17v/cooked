"use client";

import { useCallback, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";

import {
  buildShareCaption,
  buildShareUrl,
  buildTwitterShareUrl,
  downloadScoreMeme,
  shareScore,
} from "@/lib/score-meme";

export type ScoreShareActionsProps = {
  score: number;
  shareSlug: string;
  heatLabel?: string | null;
  headline?: string | null;
  className?: string;
  tone?: "default" | "landing";
};

type Flash = "link" | "caption" | "download" | "share" | null;

export function ScoreShareActions({
  score,
  shareSlug,
  heatLabel,
  headline,
  className = "",
  tone = "default",
}: ScoreShareActionsProps) {
  const [flash, setFlash] = useState<Flash>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);

  const shareUrl = buildShareUrl(shareSlug);
  const caption = buildShareCaption({ score, heatLabel, headline, shareUrl });

  const blink = useCallback((key: Flash) => {
    setFlash(key);
    window.setTimeout(() => setFlash(null), 2000);
  }, []);

  const onCopyLink = useCallback(async () => {
    setErr(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      blink("link");
    } catch {
      setErr("Could not copy link — try again.");
    }
  }, [shareUrl, blink]);

  const onCopyCaption = useCallback(async () => {
    setErr(null);
    try {
      await navigator.clipboard.writeText(caption);
      blink("caption");
    } catch {
      setErr("Could not copy caption.");
    }
  }, [caption, blink]);

  const onDownload = useCallback(async () => {
    setErr(null);
    setBusy("download");
    try {
      await downloadScoreMeme(score);
      blink("download");
    } catch {
      setErr("Download failed — try again.");
    } finally {
      setBusy(null);
    }
  }, [score, blink]);

  const onShare = useCallback(async () => {
    setErr(null);
    setBusy("share");
    try {
      const result = await shareScore({ score, shareUrl, caption });
      if (result === "copied-link") blink("share");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setErr("Share failed — use download or copy link.");
    } finally {
      setBusy(null);
    }
  }, [score, shareUrl, caption, blink]);

  const onPostX = useCallback(() => {
    setErr(null);
    const url = buildTwitterShareUrl(caption, shareUrl);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [caption, shareUrl]);

  const btn =
    tone === "landing"
      ? "landing-dash-share-btn"
      : "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-lc-border bg-lc-elevated px-3 text-[12px] font-medium text-lc-text transition-transform duration-100 ease-out hover:-translate-y-px hover:border-lc-orange/50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => void onDownload()} disabled={busy !== null}>
          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {busy === "download" ? "Saving…" : flash === "download" ? "Saved!" : "Save image"}
        </button>
        <button type="button" className={btn} onClick={() => void onShare()} disabled={busy !== null}>
          <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {busy === "share" ? "Opening…" : "Share"}
        </button>
        <button type="button" className={btn} onClick={onPostX}>
          Post on X
        </button>
        <button type="button" className={btn} onClick={() => void onCopyLink()}>
          <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {flash === "link" ? "Copied!" : "Copy link"}
        </button>
        <button type="button" className={btn} onClick={() => void onCopyCaption()}>
          <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {flash === "caption" ? "Copied!" : "Copy caption"}
        </button>
      </div>
      <p className={tone === "landing" ? "landing-dash-muted mt-2 text-[11px]" : "mt-2 text-[11px] leading-relaxed text-lc-dim"}>
        Save the meme, share to stories or messages, or post with your public score link.
      </p>
      {err ? (
        <p className="mt-2 text-[12px] text-lc-hard" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
