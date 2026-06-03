"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

import { fetchResumePdfBlob } from "@/lib/api";

type Props = {
  resumeId: string;
  className?: string;
};

/** PDF-only preview for authenticated dashboard. No pasted-text fallback (deferred). */
export function ResumePreviewPanel({ resumeId, className = "" }: Props) {
  const { getToken, isSignedIn } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [loading, setLoading] = useState(false);

  const bearer = useCallback(async () => {
    if (!isSignedIn) return undefined;
    const t = await getToken();
    return t ?? undefined;
  }, [getToken, isSignedIn]);

  useEffect(() => {
    let revoked: string | null = null;
    if (!resumeId) {
      setPdfUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPdfError(false);
      try {
        const token = await bearer();
        const blob = await fetchResumePdfBlob(resumeId, token ? { token } : undefined);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setPdfUrl(url);
      } catch {
        if (!cancelled) {
          setPdfError(true);
          setPdfUrl(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [resumeId, bearer]);

  return (
    <div
      className={`flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-lc-border bg-lc-surface ${className}`}
    >
      <p className="border-b border-lc-border px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-lc-dim">
        Resume preview
      </p>
      <div className="relative min-h-0 flex-1">
        {pdfUrl ? (
          <iframe
            title="Resume PDF preview"
            src={pdfUrl}
            className="h-full min-h-[320px] w-full bg-[#1a1a1a]"
          />
        ) : loading ? (
          <p className="p-6 text-[13px] text-lc-muted">Loading PDF…</p>
        ) : pdfError ? (
          <p className="p-6 text-[13px] text-lc-muted">Could not load PDF preview.</p>
        ) : (
          <p className="p-6 text-[13px] text-lc-muted">PDF preview unavailable.</p>
        )}
      </div>
    </div>
  );
}
