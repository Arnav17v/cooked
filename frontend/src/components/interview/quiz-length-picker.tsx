"use client";

import { useId } from "react";
import { QUIZ_LENGTH_OPTIONS, type QuizLengthId } from "@/lib/quiz-length";

type QuizLengthPickerProps = {
  value: QuizLengthId;
  onChange: (id: QuizLengthId) => void;
  disabled?: boolean;
  className?: string;
};

export function QuizLengthPicker({ value, onChange, disabled, className = "" }: QuizLengthPickerProps) {
  const groupId = useId();
  return (
    <fieldset disabled={disabled} className={`min-w-0 ${className}`}>
      <legend className="mb-3 text-[14px] font-medium text-lc-text">Quiz length</legend>
      <div className="grid grid-cols-3 gap-2">
        {QUIZ_LENGTH_OPTIONS.map((opt) => (
          <label key={opt.id} className="relative min-w-0 cursor-pointer">
            <input
              type="radio"
              name={groupId}
              value={opt.id}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
              className="peer sr-only"
            />
            <span className="quiz-length-option flex min-h-[76px] flex-col items-center justify-center rounded-lg border border-lc-border bg-lc-surface px-1.5 py-3 text-center text-lc-muted transition-colors hover:border-lc-muted peer-checked:border-lc-orange peer-checked:bg-lc-orange/10 peer-checked:text-lc-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lc-orange peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
              <span className="text-[14px] font-semibold leading-5">{opt.label}</span>
              <span className="mt-1 text-[11px] leading-4 text-lc-muted">{opt.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
