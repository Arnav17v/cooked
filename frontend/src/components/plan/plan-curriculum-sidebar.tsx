"use client";

import type { PlanModuleDto, PrepPlanDayDto, PrepPlanDto } from "@/lib/api";
import { computeOverallProgress, dayModuleCounts } from "@/components/plan/plan-utils";

type Props = {
  plan: PrepPlanDto;
  days: PrepPlanDayDto[];
  selectedDayId: string;
  selectedModuleId: string | null;
  generatingDayId: string | null;
  className?: string;
  onSelectDay: (dayId: string) => void;
  onSelectModule: (dayId: string, moduleId: string) => void;
  onGenerateDay: (dayId: string) => void;
};

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="plan-progress-track" aria-hidden>
      <div className="plan-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ModuleIcon({ kind }: { kind: string }) {
  const letter = kind === "task" ? "T" : kind === "quiz" ? "Q" : "N";
  return (
    <span className={`plan-curriculum-icon plan-curriculum-icon--${kind}`} aria-hidden>
      {letter}
    </span>
  );
}

function dayStatusHint(day: PrepPlanDayDto, generatingDayId: string | null): string {
  if (generatingDayId === day.id || day.modules_status === "generating") return "Building…";
  if (day.modules_status === "pending") return "Not generated";
  if (day.modules_status === "failed") return "Failed";
  const { done, total } = dayModuleCounts(day);
  return `${done}/${total} items`;
}

function CurriculumModuleRow({
  mod,
  isActive,
  onSelect,
}: {
  mod: PlanModuleDto;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`plan-curriculum-item${isActive ? " plan-curriculum-item--active" : ""}${
          mod.completed ? " plan-curriculum-item--done" : ""
        }`}
        onClick={onSelect}
      >
        <ModuleIcon kind={mod.kind} />
        <span className="plan-curriculum-item-title">{mod.title}</span>
        {mod.kind === "quiz" && mod.quiz_score != null ? (
          <span className="plan-curriculum-quiz-score" aria-label={`Quiz score ${mod.quiz_score}`}>
            {mod.quiz_score}
          </span>
        ) : null}
        <span
          className={`plan-curriculum-check${mod.completed ? " plan-curriculum-check--done" : ""}`}
          aria-hidden
        >
          {mod.completed ? "✓" : ""}
        </span>
      </button>
    </li>
  );
}

export function PlanCurriculumSidebar({
  plan,
  days,
  selectedDayId,
  selectedModuleId,
  generatingDayId,
  className = "",
  onSelectDay,
  onSelectModule,
  onGenerateDay,
}: Props) {
  const overall = computeOverallProgress(days);
  const planTitle = plan.plan_title || `${plan.company_name} prep`;

  return (
    <aside
      className={`plan-curriculum${className ? ` ${className}` : ""}`}
      aria-label="Course content"
    >
      <div className="plan-curriculum-header">
        <p className="plan-field-label">Course content</p>
        <h2 className="plan-curriculum-title">{planTitle}</h2>
        <div className="plan-curriculum-progress">
          <ProgressBar pct={overall.pct} />
          <p className="plan-progress-label">
            {overall.pct}% complete
            {overall.total > 0 ? ` · ${overall.done}/${overall.total} items` : ""}
          </p>
        </div>
      </div>

      <nav className="plan-curriculum-days">
        {days.map((day) => {
          const expanded = day.id === selectedDayId;
          const ready = day.modules_status === "ready";
          const hint = dayStatusHint(day, generatingDayId);

          return (
            <section
              key={day.id}
              className={`plan-curriculum-day${expanded ? " plan-curriculum-day--expanded" : ""}${
                day.is_today ? " plan-curriculum-day--today" : ""
              }${day.is_backlog ? " plan-curriculum-day--backlog" : ""}`}
            >
              <button
                type="button"
                className="plan-curriculum-day-header"
                aria-expanded={expanded}
                onClick={() => {
                  onSelectDay(day.id);
                  if (!ready && day.modules_status !== "generating") {
                    onGenerateDay(day.id);
                  }
                }}
              >
                <span className="plan-curriculum-day-chevron" aria-hidden>
                  {expanded ? "▾" : "▸"}
                </span>
                <span className="plan-curriculum-day-heading">
                  <span className="plan-curriculum-day-label">
                    Day {day.day_number} · {day.date}
                  </span>
                  <span className="plan-curriculum-day-focus">{day.focus_area}</span>
                  <span className="plan-curriculum-day-meta">
                    {day.is_today ? (
                      <span className="plan-today-pill">Today</span>
                    ) : null}
                    {day.is_backlog ? (
                      <span className="plan-backlog-pill">Backlog</span>
                    ) : null}
                    <span className="plan-curriculum-day-count">{hint}</span>
                  </span>
                </span>
              </button>

              {expanded && ready ? (
                <ul className="plan-curriculum-items">
                  {day.modules.map((mod) => (
                    <CurriculumModuleRow
                      key={mod.id}
                      mod={mod}
                      isActive={selectedModuleId === mod.id}
                      onSelect={() => onSelectModule(day.id, mod.id)}
                    />
                  ))}
                </ul>
              ) : null}

              {expanded && !ready ? (
                <p className="plan-curriculum-day-placeholder">
                  {day.modules_status === "failed"
                    ? "Generation failed — select day to retry"
                    : generatingDayId === day.id || day.modules_status === "generating"
                      ? "Building modules…"
                      : "Open to generate this day"}
                </p>
              ) : null}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
