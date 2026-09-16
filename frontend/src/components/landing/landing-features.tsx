import { ArrowRight } from "lucide-react";

const dimensions = [
  { label: "ATS", score: 17, max: 20 },
  { label: "Content", score: 31, max: 40 },
  { label: "Writing", score: 7, max: 10 },
  { label: "Job Match", score: 21, max: 25 },
];

export function LandingFeatures() {
  return (
    <section className="border-y border-lc-divider py-14 sm:py-20" id="features">
      <div className="landing-page">
        <div className="mb-10 max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight text-lc-text sm:text-4xl">Know what to work on next.</h2>
          <p className="mt-4 text-sm leading-7 text-lc-muted">A score is a starting point. The useful part is knowing which story needs work, and how to practice it.</p>
        </div>
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
          <article>
            <h3 className="mb-2 text-base font-semibold text-lc-text">Find the gaps</h3>
            <p className="mb-6 text-sm leading-6 text-lc-muted">Your Resume Score breaks the review into four dimensions, so you can focus your effort.</p>
            <div className="rounded-md border border-lc-border bg-lc-header p-5">
              <p className="mb-4 text-xs text-lc-dim">Sample Resume Score breakdown</p>
              <dl className="space-y-3">
                {dimensions.map(({ label, score, max }) => (
                  <div key={label}>
                    <div className="mb-1.5 flex justify-between text-xs"><dt className="text-lc-muted">{label}</dt><dd className="font-mono text-lc-text">{score}<span className="text-lc-dim">/{max}</span></dd></div>
                    <div className="h-1 overflow-hidden rounded-full bg-lc-elevated"><div className="h-full bg-lc-muted" style={{ width: `${score / max * 100}%` }} /></div>
                  </div>
                ))}
              </dl>
            </div>
          </article>
          <article>
            <h3 className="mb-2 text-base font-semibold text-lc-text">Build a stronger story</h3>
            <p className="mb-6 text-sm leading-6 text-lc-muted">AI Insights point to your exact words. The In-Depth Review connects them to your interview prep.</p>
            <div className="border-l-2 border-lc-orange pl-5">
              <p className="mb-3 text-xs text-lc-dim">Sample insight</p>
              <p className="text-base leading-7 text-lc-text">“Responsible for coding features on the payment team.”</p>
              <p className="mt-4 text-sm leading-6 text-lc-muted">Name the feature you owned, the trade-off you made, and the result you can back up. Use real measurements where you have them.</p>
            </div>
          </article>
          <article>
            <h3 className="mb-2 text-base font-semibold text-lc-text">Put the prep into practice</h3>
            <p className="mb-6 text-sm leading-6 text-lc-muted">Follow resume-based questions into focused notes, practice, and your day-by-day plan.</p>
            <ol className="divide-y divide-lc-divider border-y border-lc-divider">
              {["Explain your payments architecture", "Work through a failure scenario", "Practice your ownership story"].map((item, i) => (
                <li key={item} className="flex items-start gap-3 py-4 text-sm text-lc-text"><span className="font-mono text-xs leading-6 text-lc-dim">0{i + 1}</span>{item}</li>
              ))}
            </ol>
            <a href="#sample" className="mt-5 inline-flex items-center gap-2 text-sm text-lc-orange hover:underline">Explore the sample plan <ArrowRight size={14} aria-hidden /></a>
          </article>
        </div>
      </div>
    </section>
  );
}
