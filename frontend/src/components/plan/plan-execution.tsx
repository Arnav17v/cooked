"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ActivePlanResponse } from "@/lib/api";
import { PlanCurriculumSidebar } from "@/components/plan/plan-curriculum-sidebar";
import { PlanModuleViewer } from "@/components/plan/plan-module-viewer";
import { pickDefaultDayId, pickDefaultModuleId } from "@/components/plan/plan-utils";

type Props = {
  data: ActivePlanResponse;
  onCompleteModule: (moduleId: string) => void;
  completingModuleId: string | null;
  generatingDayId: string | null;
  onGenerateDay: (dayId: string) => void;
};

export function PlanExecution({
  data,
  onCompleteModule,
  completingModuleId,
  generatingDayId,
  onGenerateDay,
}: Props) {
  const { plan, days } = data;
  const [selectedDayId, setSelectedDayId] = useState<string>(() => pickDefaultDayId(days));
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(() => {
    const day = days.find((d) => d.id === pickDefaultDayId(days));
    return pickDefaultModuleId(day);
  });
  const [curriculumOpen, setCurriculumOpen] = useState(false);

  const selectedDay = useMemo(
    () => days.find((d) => d.id === selectedDayId) ?? days[0],
    [days, selectedDayId],
  );

  const selectedModule = useMemo(() => {
    if (!selectedDay || !selectedModuleId) return null;
    return selectedDay.modules.find((m) => m.id === selectedModuleId) ?? null;
  }, [selectedDay, selectedModuleId]);

  const moduleIndex = useMemo(() => {
    if (!selectedDay || !selectedModuleId) return -1;
    return selectedDay.modules.findIndex((m) => m.id === selectedModuleId);
  }, [selectedDay, selectedModuleId]);

  const mobileLessonLabel = useMemo(() => {
    if (!selectedDay) return "Select a lesson";
    if (selectedDay.modules_status !== "ready") {
      return `Day ${selectedDay.day_number} · Preparing…`;
    }
    if (selectedModule) {
      return `Day ${selectedDay.day_number} · ${selectedModule.title}`;
    }
    return `Day ${selectedDay.day_number} · ${selectedDay.focus_area}`;
  }, [selectedDay, selectedModule]);

  const selectDay = useCallback(
    (dayId: string) => {
      setSelectedDayId(dayId);
      const day = days.find((d) => d.id === dayId);
      setSelectedModuleId(pickDefaultModuleId(day));
    },
    [days],
  );

  const selectModule = useCallback((dayId: string, moduleId: string) => {
    setSelectedDayId(dayId);
    setSelectedModuleId(moduleId);
    setCurriculumOpen(false);
  }, []);

  useEffect(() => {
    const defaultDayId = pickDefaultDayId(days);
    if (defaultDayId && !days.some((d) => d.id === selectedDayId)) {
      selectDay(defaultDayId);
    }
  }, [days, selectedDayId, selectDay]);

  useEffect(() => {
    if (!selectedDay) return;
    if (selectedDay.modules_status === "ready" && selectedModuleId) {
      const exists = selectedDay.modules.some((m) => m.id === selectedModuleId);
      if (!exists) setSelectedModuleId(pickDefaultModuleId(selectedDay));
      return;
    }
    if (selectedDay.modules_status === "ready" && !selectedModuleId) {
      setSelectedModuleId(pickDefaultModuleId(selectedDay));
    }
  }, [selectedDay, selectedModuleId]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const onChange = () => setCurriculumOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!curriculumOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [curriculumOpen]);

  function goPrev() {
    if (!selectedDay || moduleIndex <= 0) return;
    setSelectedModuleId(selectedDay.modules[moduleIndex - 1].id);
  }

  function goNext() {
    if (!selectedDay || moduleIndex < 0 || moduleIndex >= selectedDay.modules.length - 1) return;
    setSelectedModuleId(selectedDay.modules[moduleIndex + 1].id);
  }

  const backlogCount = plan.backlog_count ?? 0;
  const curriculumClass = curriculumOpen ? " plan-curriculum--drawer-open" : "";

  const sidebar = (
    <PlanCurriculumSidebar
      plan={plan}
      days={days}
      selectedDayId={selectedDayId}
      selectedModuleId={selectedModuleId}
      generatingDayId={generatingDayId}
      className={curriculumClass}
      onSelectDay={selectDay}
      onSelectModule={selectModule}
      onGenerateDay={onGenerateDay}
    />
  );

  return (
    <div
      className={`plan-execution-wrap plan-coursera-shell${
        curriculumOpen ? " plan-coursera-shell--curriculum-open" : ""
      }`}
    >
      <div className="plan-execution-header">
        <h1 className="plan-execution-title">
          <span className="plan-execution-title-primary">{plan.company_name}</span>
          <span className="plan-execution-title-sep" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <span className="plan-execution-title-role">{plan.role}</span>
          <span className="plan-execution-title-sep" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <span className="plan-execution-title-date">Interview {plan.interview_date}</span>
        </h1>
        {backlogCount > 0 ? (
          <span
            className="plan-backlog-hint"
            role="status"
            tabIndex={0}
            aria-label={`${backlogCount} overdue item${backlogCount === 1 ? "" : "s"} from past days — catch up when you can.`}
          >
            <span className="plan-backlog-hint-mark" aria-hidden>
              !
            </span>
            <span className="plan-backlog-hint-tooltip" role="tooltip">
              {backlogCount} overdue item{backlogCount === 1 ? "" : "s"} from past days — catch up
              when you can.
            </span>
          </span>
        ) : null}
      </div>

      <div className="plan-coursera-split">
        {curriculumOpen ? (
          <button
            type="button"
            className="plan-curriculum-backdrop"
            aria-label="Close course content"
            onClick={() => setCurriculumOpen(false)}
          />
        ) : null}

        {sidebar}

        <div className="plan-lesson-main">
          <div className="plan-mobile-chrome">
            <button
              type="button"
              className="plan-mobile-chrome-btn"
              aria-expanded={curriculumOpen}
              onClick={() => setCurriculumOpen((open) => !open)}
            >
              Course content
            </button>
            <span className="plan-mobile-chrome-title">{mobileLessonLabel}</span>
          </div>

          {selectedDay ? (
            <PlanModuleViewer
              plan={plan}
              day={selectedDay}
              module={selectedModule}
              moduleIndex={moduleIndex}
              moduleCount={selectedDay.modules.length}
              generating={
                generatingDayId === selectedDay.id || selectedDay.modules_status === "generating"
              }
              onCompleteModule={onCompleteModule}
              completingModuleId={completingModuleId}
              onRetryGenerate={() => onGenerateDay(selectedDay.id)}
              onPrev={goPrev}
              onNext={goNext}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
