"use client";

import { useRouter } from "next/navigation";

import type { PlanModuleDto, PrepPlanDayDto, PrepPlanDto } from "@/lib/api";
import { PlanModuleContent, moduleKindLabel } from "@/components/plan/plan-module-content";
import { normalizeHeatLabel } from "@/components/roast/roast-shared";
import { QUIZ_START_HANDOFF_KEY, type QuizStartHandoff } from "@/lib/interview-quiz-start-handoff";

type Props = {
  plan: PrepPlanDto;
  day: PrepPlanDayDto;
  module: PlanModuleDto | null;
  moduleIndex: number;
  moduleCount: number;
  generating: boolean;
  onCompleteModule: (moduleId: string) => void;
  completingModuleId: string | null;
  onRetryGenerate: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function buildQuizJd(day: PrepPlanDayDto, mod: PlanModuleDto): string {
  const topics =
    mod.quiz_topics.length > 0
      ? mod.quiz_topics.map((t) => `• ${t}`).join("\n")
      : "• General review";
  return `Focus: ${day.focus_area}\n\nQuiz: ${mod.title}\n\nTopics:\n${topics}`;
}

export function PlanModuleViewer({
  plan,
  day,
  module,
  moduleIndex,
  moduleCount,
  generating,
  onCompleteModule,
  completingModuleId,
  onRetryGenerate,
  onPrev,
  onNext,
}: Props) {
  const router = useRouter();
  const notReady = day.modules_status !== "ready";
  const hasPrev = moduleIndex > 0;
  const hasNext = moduleIndex >= 0 && moduleIndex < moduleCount - 1;

  function startQuiz(mod: PlanModuleDto) {
    const handoff: QuizStartHandoff = {
      resumeId: plan.resume_id,
      role: plan.role,
      question_count: 3,
      plan_module_id: mod.id,
      plan_id: plan.id,
      return_to: `/plan?plan=${plan.id}`,
      origin: "plan",
      job_description: buildQuizJd(day, mod),
    };
    try {
      window.localStorage.setItem(QUIZ_START_HANDOFF_KEY, JSON.stringify(handoff));
    } catch {
      /* ignore */
    }
    router.push("/quiz/start");
  }

  return (
    <div className="plan-lesson-panel">
      <div className="plan-lesson-context">
        <div className="plan-day-card-top">
          {day.is_today ? <span className="plan-today-pill">Today</span> : null}
          {day.is_backlog ? <span className="plan-backlog-pill">Backlog</span> : null}
        </div>
        <p className="plan-lesson-day-focus">{day.focus_area}</p>
      </div>

      {notReady ? (
        <div className="plan-day-modules-loading">
          {day.modules_status === "failed" ? (
            <>
              <p className="plan-day-modules-error">
                {day.modules_error || "Could not build modules for this day."}
              </p>
              <button type="button" className="plan-secondary-btn" onClick={onRetryGenerate}>
                Retry
              </button>
            </>
          ) : (
            <>
              <p className="plan-day-modules-status">
                {generating || day.modules_status === "generating"
                  ? `Building notes and tasks for Day ${day.day_number}…`
                  : `Day ${day.day_number} modules will generate when you open this day.`}
              </p>
              <div className="plan-day-modules-skeleton" aria-hidden />
            </>
          )}
        </div>
      ) : !module ? (
        <p className="plan-day-modules-status">Select a lesson from the course content.</p>
      ) : (
        <article className="plan-lesson-article">
          <nav className="plan-lesson-breadcrumb" aria-label="Breadcrumb">
            <span>Day {day.day_number}</span>
            <span className="plan-lesson-breadcrumb-sep" aria-hidden>
              ›
            </span>
            <span>{moduleKindLabel(module.kind)}</span>
            <span className="plan-lesson-breadcrumb-sep" aria-hidden>
              ›
            </span>
            <span className="plan-lesson-breadcrumb-current">{module.title}</span>
          </nav>

          <header className="plan-lesson-header">
            <span className="plan-module-kind">{moduleKindLabel(module.kind)}</span>
            <h1 className="plan-lesson-title">{module.title}</h1>
          </header>

          <div className="plan-lesson-body">
            {module.content ? <PlanModuleContent content={module.content} /> : null}
            {module.link_url ? (
              <a
                href={module.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="plan-module-link"
              >
                Open link →
              </a>
            ) : null}
          </div>

          {module.kind === "quiz" && module.quiz_score != null ? (
            <div className="plan-quiz-score-card plan-quiz-score-card--lesson">
              <p className="plan-quiz-score-num">
                {module.quiz_score}
                <span className="plan-quiz-score-denom">/100</span>
              </p>
              <p className="plan-quiz-score-heat">
                {normalizeHeatLabel(module.quiz_heat_label)}
              </p>
              {module.quiz_one_liner ? (
                <p className="plan-quiz-score-oneliner">&ldquo;{module.quiz_one_liner}&rdquo;</p>
              ) : null}
            </div>
          ) : null}

          <div className="plan-lesson-actions">
            {module.kind === "quiz" ? (
              <>
                {module.quiz_score != null ? (
                  <a
                    href={`/quiz/results/${module.quiz_session_id}`}
                    className="plan-link-btn"
                  >
                    View full results
                  </a>
                ) : module.quiz_session_id ? (
                  <button
                    type="button"
                    className="plan-primary-btn"
                    onClick={() => router.push(`/quiz/${module.quiz_session_id}`)}
                  >
                    Resume quiz
                  </button>
                ) : (
                  <button
                    type="button"
                    className="plan-primary-btn"
                    onClick={() => startQuiz(module)}
                  >
                    Start quiz
                  </button>
                )}
              </>
            ) : module.completed ? (
              <button
                type="button"
                className="plan-secondary-btn plan-lesson-done-btn"
                disabled={completingModuleId === module.id}
                onClick={() => onCompleteModule(module.id)}
              >
                {completingModuleId === module.id ? "Updating…" : "Done — mark incomplete"}
              </button>
            ) : (
              <button
                type="button"
                className="plan-primary-btn plan-lesson-done-btn"
                disabled={completingModuleId === module.id}
                onClick={() => onCompleteModule(module.id)}
              >
                {completingModuleId === module.id ? "Saving…" : "Mark as done"}
              </button>
            )}
          </div>
        </article>
      )}

      {notReady || !module ? null : (
        <footer className="plan-lesson-nav">
          <button
            type="button"
            className="plan-secondary-btn plan-lesson-nav-btn"
            disabled={!hasPrev}
            onClick={onPrev}
          >
            Previous
          </button>
          <span className="plan-lesson-nav-pos">
            {moduleIndex + 1} / {moduleCount}
          </span>
          <button
            type="button"
            className="plan-secondary-btn plan-lesson-nav-btn"
            disabled={!hasNext}
            onClick={onNext}
          >
            Next
          </button>
        </footer>
      )}
    </div>
  );
}
