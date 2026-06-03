import { ImageResponse } from "next/og";

import { fetchSharePayload } from "@/lib/api";
import { DIMENSION_LABELS, DIMENSION_ORDER, resolveScoreDimensions } from "@/lib/score-dimensions";
import { dimensionScoreColor, formatHeatLabel, scoreHeatColor } from "@/lib/score-utils";
import { siteHostLabel } from "@/lib/site-url";

export const runtime = "edge";

export const alt = "Resume Score";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchSharePayload(slug);

  const scoreRaw = data?.cooked_score ?? data?.score;
  const score =
    scoreRaw !== null && scoreRaw !== undefined
      ? Math.min(100, Math.max(0, scoreRaw))
      : null;
  const dims = resolveScoreDimensions(data?.score_dimensions, undefined, score);
  const heat = formatHeatLabel(data?.heat_label);
  const color = scoreHeatColor(heat);
  const headline =
    data?.one_liner ??
    data?.headline ??
    (score !== null ? `Resume Score ${dims.total}/100` : "Am I Cooked?");
  const role = data?.target_role ?? data?.role ?? "Target role";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: "linear-gradient(145deg, #141414 0%, #0b0b0b 55%, #101010 100%)",
          color: "#e8e8e8",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#ffa116", letterSpacing: "0.08em" }}>
            AM I COOKED?
          </div>
          {data?.degraded ? (
            <div
              style={{
                fontSize: 14,
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                color: "#b3b3b3",
              }}
            >
              degraded mode
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <div style={{ fontSize: 20, color: "#8f8f8f", textTransform: "uppercase" }}>Resume Score</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 96, fontWeight: 700, color, lineHeight: 1 }}>{dims.total}</div>
              <div style={{ fontSize: 28, color: "#bdbdbd" }}>/ {dims.total_max}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, color }}>{heat}</div>
            <div style={{ fontSize: 24, color: "#cfcfcf" }}>{role}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 380 }}>
            {DIMENSION_ORDER.map((key) => {
              const entry = dims[key];
              const dimColor = dimensionScoreColor(entry.score, entry.max);
              return (
                <div
                  key={key}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#a8a8a8" }}
                >
                  <span>{DIMENSION_LABELS[key]}</span>
                  <span style={{ color: dimColor }}>
                    {entry.score}/{entry.max}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 22, color: "#9a9a9a", maxWidth: 1000, lineHeight: 1.35 }}>“{headline}”</div>

        <div style={{ fontSize: 20, color: "#7a7a7a" }}>{siteHostLabel()}</div>
      </div>
    ),
    { ...size },
  );
}
