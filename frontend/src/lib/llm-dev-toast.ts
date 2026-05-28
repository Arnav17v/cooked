/** Dev-only LLM fallback toasts — backend emits when ``DEV=1``. */

export const LLM_DEV_TOAST_EVENT = "cooked-llm-dev";

export type LlmDevEvent = {
  kind: string;
  task?: string;
  model?: string;
  from_model?: string;
  to_model?: string;
  provider?: string;
  from_provider?: string;
  to_provider?: string;
  reason?: string;
  degraded?: boolean;
  chain_index?: number;
};

export type LlmDevToastPayload = {
  title: string;
  detail: string;
  tone?: "warn" | "ok";
};

export function formatLlmDevToast(ev: LlmDevEvent): LlmDevToastPayload {
  const task = ev.task ? ` (${ev.task})` : "";

  switch (ev.kind) {
    case "model_switch":
      return {
        title: `Model failed${task}`,
        detail: `${ev.from_model ?? "model"} failed — trying ${ev.to_model ?? "next model"}`,
        tone: "warn",
      };
    case "model_ok":
      return {
        title: `Fallback model OK${task}`,
        detail: `Response from ${ev.model ?? ev.provider ?? "Google"} (#${ev.chain_index ?? "?"})`,
        tone: "ok",
      };
    case "vendor_failover":
      return {
        title: `Vendor failover${task}`,
        detail: `${ev.from_provider ?? "primary"} failed — trying ${ev.to_provider ?? "backup"}`,
        tone: "warn",
      };
    case "vendor_ok":
      return {
        title: `Backup vendor OK${task}`,
        detail: `${ev.provider ?? "fallback"} succeeded (degraded run)`,
        tone: "ok",
      };
    default:
      return {
        title: `LLM ${ev.kind}${task}`,
        detail: ev.reason ?? JSON.stringify(ev),
        tone: "warn",
      };
  }
}

export function showLlmDevToast(ev: LlmDevEvent): void {
  if (typeof window === "undefined") return;
  const formatted = formatLlmDevToast(ev);
  window.dispatchEvent(
    new CustomEvent(LLM_DEV_TOAST_EVENT, { detail: { event: ev, ...formatted } }),
  );
}

export function showLlmDevTrace(events: LlmDevEvent[] | undefined | null): void {
  if (!events?.length) return;
  for (const ev of events) {
    showLlmDevToast(ev);
  }
}
