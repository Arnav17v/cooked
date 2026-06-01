"use client";

import type { ReactNode } from "react";
import { FileCode2, MessageSquare } from "lucide-react";
import Link from "next/link";

import { LandingCustomCursor } from "@/components/landing/landing-custom-cursor";
import { LandingNav } from "@/components/landing/landing-nav";
import { PipelineProgress } from "@/components/ui/pipeline-progress";

export function QuizPageShell({
  eyebrow = "// interview",
  title,
  description,
  showHero = true,
  contentClassName = "max-w-[720px]",
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  showHero?: boolean;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="landing-v3 overflow-x-clip max-w-full bg-lv-black text-lv-cream">
      <LandingCustomCursor />
      <LandingNav />
      {showHero ? (
        <div className="mx-auto max-w-[1100px] border-b border-lv-rule px-4 sm:px-6 lg:px-12">
          <section className="py-10 md:py-12">
            <p className="mb-5 flex items-center gap-3 font-jetbrains text-[11px] uppercase tracking-[0.2em] text-lv-rust before:h-px before:w-8 before:bg-lv-rust before:content-['']">
              {eyebrow}
            </p>
            <h1 className="font-playfair text-[1.75rem] font-normal leading-tight tracking-tight text-lv-cream sm:text-[clamp(1.85rem,4vw,2.35rem)]">
              {title}
            </h1>
            {description ? (
              <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-lv-cream-dim sm:text-sm sm:leading-7">
                {description}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
      <div
        className={`mx-auto w-full px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8 ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}



function TrafficLights() {
  return (
    <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
      <span className="h-2.5 w-2.5 rounded-full bg-[#ef4743]/80" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#ffc01e]/80" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#00b8a3]/80" />
    </div>
  );
}

function PaneTitle({ filename, icon }: { filename: string; icon?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 font-jetbrains text-[11px] text-lv-cream-dim">
      {icon ?? <FileCode2 className="h-3.5 w-3.5 shrink-0 text-lv-rust" strokeWidth={2} />}
      <span className="truncate">{filename}</span>
    </div>
  );
}

export function QuizEditorPane({
  filename,
  icon,
  children,
  className = "",
  footer,
}: {
  filename: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <div className={`border border-lv-rule bg-lv-surface ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-lv-rule bg-lv-black/60 px-3 py-2 sm:px-4">
        <PaneTitle filename={filename} icon={icon} />
        <TrafficLights />
      </header>
      <div className="px-4 py-5 sm:px-5 sm:py-6">{children}</div>
      {footer ? <footer className="border-t border-lv-rule px-4 py-3 sm:px-5">{footer}</footer> : null}
    </div>
  );
}

export function QuizPrimaryButton({
  children,
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group relative inline-flex w-full items-center justify-center overflow-hidden bg-lv-cream px-5 py-3.5 font-jetbrains text-xs font-medium uppercase tracking-widest text-lv-black transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-lv-rust transition-transform duration-300 ease-lv group-hover:translate-x-0"
      />
      <span className="relative z-10 transition-colors group-hover:text-lv-cream">{children}</span>
    </button>
  );
}

export function QuizSecondaryButton({
  children,
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center border border-lv-rule bg-lv-surface px-5 font-jetbrains text-[11px] uppercase tracking-wide text-lv-cream transition-colors hover:border-lv-rust/50 hover:bg-lv-rust/[0.06] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

const fieldClass =
  "w-full border border-lv-rule bg-lv-black/40 px-3.5 py-2.5 font-jetbrains text-[13px] leading-relaxed text-lv-cream outline-none transition-colors placeholder:text-lv-cream/30 focus:border-lv-rust/70 disabled:opacity-50";

export function QuizFieldTextarea({
  value,
  onChange,
  rows = 8,
  placeholder,
  disabled,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-jetbrains text-[11px] uppercase tracking-widest text-lv-cream-dim">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        className={`${fieldClass} resize-y`}
      />
      {hint ? <p className="mt-2 text-[11px] leading-relaxed text-lv-cream/45">{hint}</p> : null}
    </label>
  );
}

export function QuizStepRail({
  total,
  currentIndex,
  answeredThrough,
}: {
  total: number;
  currentIndex: number;
  answeredThrough: number;
}) {
  if (total < 1) return null;
  return (
    <div className="mb-6 flex flex-wrap gap-1.5 sm:gap-2" aria-label={`Question ${currentIndex + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === currentIndex;
        const isDone = i <= answeredThrough && !isCurrent;
        const num = String(i + 1).padStart(2, "0");
        return (
          <span
            key={i}
            className={`inline-flex min-w-[2.75rem] items-center justify-center border px-2 py-1 font-jetbrains text-[10px] tabular-nums tracking-wide ${
              isCurrent
                ? "border-lv-rust bg-lv-rust/15 text-lv-cream"
                : isDone
                  ? "border-lv-rust/35 bg-lv-rust/5 text-lv-cream-dim"
                  : "border-lv-rule bg-transparent text-lv-cream/35"
            }`}
            aria-current={isCurrent ? "step" : undefined}
          >
            Q.{num}
          </span>
        );
      })}
    </div>
  );
}

export function QuizMetaGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid gap-px border border-lv-rule bg-lv-rule text-[13px] sm:grid-cols-2">{children}</dl>
  );
}

export function QuizMetaRow({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 bg-lv-surface px-4 py-3 sm:flex-col sm:items-start">
      <dt className="font-jetbrains text-[10px] uppercase tracking-widest text-lv-cream-dim">{label}</dt>
      <dd className={`font-medium ${accent ? "text-lv-rust" : "text-lv-cream"}`}>{value}</dd>
    </div>
  );
}

export function QuizLoadingPanel({
  title,
  detail,
  percent,
}: {
  title: string;
  detail?: string;
  percent?: number;
}) {
  return (
    <div className="border border-lv-rule bg-lv-surface px-6 py-14 text-center sm:py-16">
      <div
        className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-lv-rule border-t-lv-rust"
        aria-hidden
      />
      <p className="mt-8 font-jetbrains text-[13px] font-medium uppercase tracking-wide text-lv-cream">{title}</p>
      {typeof percent === "number" ? (
        <PipelineProgress className="mx-auto mt-6 max-w-sm" percent={percent} tone="landing" />
      ) : null}
      {detail ? <p className="mt-4 text-[13px] leading-relaxed text-lv-cream-dim">{detail}</p> : null}
    </div>
  );
}

export function QuizErrorPanel({
  message,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: {
  message: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <QuizEditorPane
      filename="session_error.log"
      icon={<MessageSquare className="h-3.5 w-3.5 shrink-0 text-lv-rust" strokeWidth={2} />}
    >
      <p className="text-[14px] leading-relaxed text-lv-cream-dim">{message}</p>
      <Link
        href={backHref}
        className="mt-6 inline-block font-jetbrains text-[11px] uppercase tracking-wide text-lv-rust no-underline hover:text-lv-cream hover:underline"
      >
        {backLabel}
      </Link>
    </QuizEditorPane>
  );
}

export function QuizProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="mt-8">
      <div className="mb-2 flex justify-between font-jetbrains text-[10px] uppercase tracking-wide text-lv-cream-dim">
        <span>Progress</span>
        <span className="tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div
        className="landing-pipeline-track h-1.5"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="landing-pipeline-bar h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
