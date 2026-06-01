import type { PlanModuleDto, PrepPlanDayDto } from "@/lib/api";

export function computeOverallProgress(days: PrepPlanDayDto[]): {
  pct: number;
  done: number;
  total: number;
} {
  let done = 0;
  let total = 0;
  for (const d of days) {
    if (d.modules_status !== "ready") continue;
    for (const m of d.modules) {
      total += 1;
      if (m.completed) done += 1;
    }
  }
  return {
    pct: total ? Math.round((100 * done) / total) : 0,
    done,
    total,
  };
}

export function pickDefaultDayId(days: PrepPlanDayDto[]): string {
  const today = days.find((d) => d.is_today);
  if (today) return today.id;
  const ready = days.find((d) => d.modules_status === "ready");
  if (ready) return ready.id;
  return days[0]?.id ?? "";
}

export function pickDefaultModuleId(day: PrepPlanDayDto | undefined): string | null {
  if (!day || day.modules_status !== "ready" || day.modules.length === 0) return null;
  const incomplete = day.modules.find((m) => !m.completed);
  return (incomplete ?? day.modules[0]).id;
}

export function dayModuleCounts(day: PrepPlanDayDto): { done: number; total: number } {
  if (day.modules_status !== "ready") return { done: 0, total: 0 };
  const total = day.modules.length;
  const done = day.modules.filter((m) => m.completed).length;
  return { done, total };
}

export function findModuleInDay(
  day: PrepPlanDayDto,
  moduleId: string,
): PlanModuleDto | undefined {
  return day.modules.find((m) => m.id === moduleId);
}
