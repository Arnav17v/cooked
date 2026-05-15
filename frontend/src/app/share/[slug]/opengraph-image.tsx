import { ImageResponse } from "next/og";

import { fetchSharePayload } from "@/lib/api";

export const runtime = "edge";

export const alt = "Cooked Score";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

function normalizeHeat(label: string | null | undefined): string {
  const lower = (label ?? "Medium").trim().toLowerCase();
  const map: Record<string, string> = {
    easy: "Raw",
    raw: "Raw",
    medium: "Medium",
    hard: "Hard",
    cooked: "Cooked",
  };
  return map[lower] ?? "Medium";
}

function heatColor(heat: string): string {
  const h = heat.toLowerCase();
  if (h === "raw" || h === "easy") return "#00b8a3";
  if (h === "medium") return "#ffc01e";
  if (h === "hard") return "#ff8c42";
  if (h === "cooked") return "#ef4743";
  return "#ffc01e";
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchSharePayload(slug);

  const scoreRaw = data?.cooked_score ?? data?.score;
  const score =
    scoreRaw !== null && scoreRaw !== undefined
      ? Math.min(100, Math.max(0, scoreRaw))
      : null;
  const heat = normalizeHeat(data?.heat_label);
  const color = heatColor(heat);
  const headline =
    data?.one_liner ??
    data?.headline ??
    (score !== null ? `I scored ${score}/100 on the Cooked Score.` : "Am I Cooked?");
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

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 22, color: "#8f8f8f", textTransform: "uppercase" }}>
            Cooked Score
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ fontSize: 120, fontWeight: 700, color, lineHeight: 1 }}>{score ?? "--"}</div>
            <div style={{ fontSize: 28, color: "#bdbdbd" }}>/ 100</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color }}>{heat}</div>
          <div style={{ fontSize: 28, color: "#cfcfcf" }}>{role}</div>
          <div style={{ fontSize: 26, color: "#a8a8a8", maxWidth: 980, lineHeight: 1.35 }}>
            “{headline}”
          </div>
        </div>

        <div style={{ fontSize: 20, color: "#7a7a7a" }}>amicooked.app</div>
      </div>
    ),
    { ...size },
  );
}
