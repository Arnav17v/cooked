"use client";

import { motion } from "motion/react";
import { useMemo } from "react";

import type { HireSignal, InDepthAnalysis, InterviewDangerLevel } from "@/lib/api";
import { EASE_DEFAULT } from "@/lib/motion-easing";

type Axis = { label: string; value: number };

function hireScore(signal: HireSignal): number {
  if (signal === "strong") return 88;
  if (signal === "moderate") return 62;
  if (signal === "weak") return 38;
  return 18;
}

function interviewReadiness(levels: InterviewDangerLevel[]): number {
  if (!levels.length) return 50;
  const map = { high: 28, medium: 55, low: 82 };
  const sum = levels.reduce((a, l) => a + map[l], 0);
  return Math.round(sum / levels.length);
}

function competitiveProxy(percentile: number): number {
  return Math.min(100, Math.max(12, Math.round(percentile * 0.82)));
}

function axesFromData(data: InDepthAnalysis): Axis[] {
  return [
    { label: "Market", value: data.market_positioning.percentile },
    { label: "Hire signal", value: hireScore(data.hiring_manager_read.hire_signal) },
    {
      label: "Interview",
      value: interviewReadiness(data.interview_forecast.map((f) => f.danger_level)),
    },
    {
      label: "vs top 10%",
      value: competitiveProxy(data.market_positioning.percentile),
    },
    { label: "30-day plan", value: 78 },
  ];
}

function polygonPoints(values: number[], cx: number, cy: number, r: number): string {
  const n = values.length;
  return values
    .map((v, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const dist = (Math.min(100, Math.max(0, v)) / 100) * r;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

type Props = {
  data: InDepthAnalysis;
};

export function InDepthRadarChart({ data }: Props) {
  const axes = useMemo(() => axesFromData(data), [data]);
  const cx = 120;
  const cy = 118;
  const r = 72;
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const values = axes.map((a) => a.value);
  const fillPoints = polygonPoints(values, cx, cy, r);

  return (
    <div className="indepth-radar" aria-label="In-depth analysis radar chart">
      <svg viewBox="0 0 240 236" className="indepth-radar-svg" role="img">
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(
              axes.map(() => level * 100),
              cx,
              cy,
              r,
            )}
            className="indepth-radar-grid"
          />
        ))}
        {axes.map((_, i) => {
          const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
          const x2 = cx + Math.cos(angle) * r;
          const y2 = cy + Math.sin(angle) * r;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              className="indepth-radar-spoke"
            />
          );
        })}
        <motion.polygon
          points={fillPoints}
          className="indepth-radar-fill"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: EASE_DEFAULT }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
        {axes.map((axis, i) => {
          const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
          const lx = cx + Math.cos(angle) * (r + 22);
          const ly = cy + Math.sin(angle) * (r + 22);
          return (
            <text
              key={axis.label}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="indepth-radar-label"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
      <ul className="indepth-radar-legend">
        {axes.map((a) => (
          <li key={a.label}>
            <span className="indepth-radar-legend-label">{a.label}</span>
            <span className="indepth-radar-legend-val">{a.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
