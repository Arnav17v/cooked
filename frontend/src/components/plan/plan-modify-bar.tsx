"use client";

import type { FormEvent } from "react";
import { useState } from "react";

type Props = {
  loading: boolean;
  onModify: (instruction: string) => void;
};

export function PlanModifyBar({ loading, onModify }: Props) {
  const [instruction, setInstruction] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = instruction.trim();
    if (!text) return;
    onModify(text);
    setInstruction("");
  }

  return (
    <form className="plan-modify-bar" onSubmit={handleSubmit}>
      <label className="plan-field plan-field--full">
        <span className="plan-field-label">Change my plan</span>
        <input
          className="plan-input"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Add more system design on days 2–3"
          maxLength={500}
          disabled={loading}
        />
      </label>
      <button type="submit" className="plan-secondary-btn" disabled={loading || !instruction.trim()}>
        {loading ? "Updating…" : "Apply"}
      </button>
    </form>
  );
}
