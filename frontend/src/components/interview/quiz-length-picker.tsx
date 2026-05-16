"use client";

import { QUIZ_LENGTH_OPTIONS, type QuizLengthId } from "@/lib/quiz-length";

type QuizLengthPickerProps = {
  value: QuizLengthId;
  onChange: (id: QuizLengthId) => void;
  disabled?: boolean;
  className?: string;
};

export function QuizLengthPicker({ value, onChange, disabled, className = "" }: QuizLengthPickerProps) {
  return (
    <div className={className}>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-lc-dim">{"// quiz length"}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quiz length">
        {QUIZ_LENGTH_OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`inline-flex min-w-[5.5rem] flex-col items-center rounded-lg border px-3 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-lc-orange/60 bg-lc-orange/15 text-lc-text"
                  : "border-lc-border bg-lc-elevated text-lc-muted hover:border-lc-orange/35 hover:text-lc-text"
              }`}
            >
              <span className="text-[13px] font-semibold">{opt.label}</span>
              <span className="mt-0.5 text-[10px] text-lc-dim">{opt.detail}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
