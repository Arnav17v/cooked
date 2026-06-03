import Link from "next/link";
import { notFound } from "next/navigation";

import { ShareScorePanel } from "@/app/share/[slug]/share-score-panel";
import { fetchSharePayload } from "@/lib/api";
import { siteHostLabel } from "@/lib/site-url";

type PageProps = { params: Promise<{ slug: string }> };

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

export default async function SharePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchSharePayload(slug);
  if (!data) {
    notFound();
  }

  const heat = normalizeHeat(data.heat_label);
  const scoreVal = data.cooked_score ?? data.score;
  if (scoreVal === null || scoreVal === undefined) {
    notFound();
  }
  const score = Math.min(100, Math.max(0, scoreVal));
  const headline = data.one_liner ?? data.headline;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <ShareScorePanel
        score={score}
        scoreDimensions={data.score_dimensions}
        heatLabel={heat}
        headline={headline}
        targetRole={data.target_role ?? data.role}
        shareSlug={slug}
        degraded={data.degraded}
        insightsPreview={data.ai_insights_preview}
      />

      <p className="mt-10 text-center font-mono text-[11px] text-lc-dim">
        <Link href="/roast" className="text-lc-orange hover:underline">
          Score your resume → {siteHostLabel()}
        </Link>
      </p>
    </main>
  );
}
