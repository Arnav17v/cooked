"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  LLM_DEV_TOAST_EVENT,
  type LlmDevToastPayload,
} from "@/lib/llm-dev-toast";

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 3;

type QueuedToast = LlmDevToastPayload & { id: number };

/**
 * Top-right stack for dev LLM fallback events (model chain + vendor failover).
 * Events come from analysis SSE or API ``dev_llm_trace`` when backend ``DEV=1``.
 */
export function LlmDevToastHost() {
  const [visible, setVisible] = useState<QueuedToast[]>([]);
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const seqRef = useRef(0);

  const enqueue = useCallback((payload: LlmDevToastPayload) => {
    seqRef.current += 1;
    const id = seqRef.current;
    setQueue((q) => [...q, { ...payload, id }]);
  }, []);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<LlmDevToastPayload>).detail;
      if (!detail?.title) return;
      enqueue(detail);
    };
    window.addEventListener(LLM_DEV_TOAST_EVENT, onEvent);
    return () => window.removeEventListener(LLM_DEV_TOAST_EVENT, onEvent);
  }, [enqueue]);

  useEffect(() => {
    if (visible.length >= MAX_VISIBLE || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setVisible((v) => [...v, next].slice(-MAX_VISIBLE));
    const t = window.setTimeout(() => {
      setVisible((v) => v.filter((item) => item.id !== next.id));
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [queue, visible.length]);

  if (visible.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[110] flex max-w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
    >
      {visible.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg shadow-black/40 ${
            t.tone === "ok"
              ? "border-[#00b8a3]/40 bg-lc-surface"
              : "border-[#ffc01e]/45 bg-lc-surface"
          }`}
        >
          <p className="font-mono text-[10px] uppercase tracking-wide text-lc-dim">LLM dev</p>
          <p className="mt-1 text-[13px] font-medium text-lc-text">{t.title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-lc-muted">{t.detail}</p>
        </div>
      ))}
    </div>
  );
}
