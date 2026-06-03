"use client";

import type { InDepthAnalysis } from "@/lib/api";

const DANGER_CLASS: Record<string, string> = {
  high: "indepth-forecast-card--high",
  medium: "indepth-forecast-card--medium",
  low: "indepth-forecast-card--low",
};

type Props = {
  items: InDepthAnalysis["interview_forecast"];
};

export function InDepthInterviewForecast({ items }: Props) {
  return (
    <ul className="indepth-forecast-list">
      {items.map((item, idx) => (
        <li
          key={`${item.topic}-${idx}`}
          className={`indepth-forecast-card ${DANGER_CLASS[item.danger_level] ?? DANGER_CLASS.medium}`}
        >
          <div className="indepth-forecast-card-top">
            <h4 className="indepth-forecast-topic">{item.topic}</h4>
            <span className="indepth-forecast-danger">{item.danger_level}</span>
          </div>
          <p className="indepth-forecast-reason">{item.reason}</p>
          <p className="indepth-forecast-q">
            <span className="indepth-forecast-q-label">Likely question</span>
            {item.likely_question}
          </p>
        </li>
      ))}
    </ul>
  );
}
