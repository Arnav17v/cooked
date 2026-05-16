/** Copy shown above long-running pipeline UIs (roast, notes, quiz start). */
export const LONG_RUN_TIME_HINT = "This usually takes 1–2 minutes.";

type PipelineProgressProps = {
  percent: number;
  className?: string;
  tone?: "default" | "landing";
};

export function PipelineProgress({
  percent,
  className = "",
  tone = "default",
}: PipelineProgressProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  if (tone === "landing") {
    return (
      <div className={className}>
        <p className="landing-pipeline-hint">{LONG_RUN_TIME_HINT}</p>
        <div
          className="landing-pipeline-track"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="landing-pipeline-bar" style={{ width: `${clamped}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className={className}>
      <p className="mb-2 text-[12px] leading-relaxed text-lc-muted">{LONG_RUN_TIME_HINT}</p>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-lc-elevated"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-lc-orange transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
