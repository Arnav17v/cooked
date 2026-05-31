function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`landing-skeleton-shimmer ${className}`} aria-hidden />;
}

export function DashboardSkeleton() {
  return (
    <div className="landing-dash-root" aria-busy="true" aria-label="Loading dashboard">
      <div className="landing-dash-mobile-bar lg:hidden">
        <Shimmer className="h-10 w-28" />
        <Shimmer className="mt-3 h-[3px] w-full" />
        <div className="landing-dash-mobile-tabs mt-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="min-h-[44px] w-full" />
          ))}
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-[var(--lv-rule)] px-6 pb-4 pt-8 lg:flex">
          <Shimmer className="h-[72px] w-24" />
          <Shimmer className="mt-3 h-4 w-32" />
          <Shimmer className="mt-4 h-12 w-full" />
          <hr className="my-4 border-0 border-t border-[var(--lv-rule)]" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="h-9 w-full rounded-sm" />
            ))}
          </div>
          <hr className="my-4 border-0 border-t border-[var(--lv-rule)]" />
          <Shimmer className="h-4 w-full" />
          <Shimmer className="mt-2 h-4 w-3/4" />
          <Shimmer className="mt-4 h-8 w-full rounded-md" />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[820px] rounded-xl border border-[var(--lv-rule)] bg-[var(--lv-elev)] p-6 sm:p-7">
            <div className="space-y-5 lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-8 lg:space-y-0">
              <section className="min-w-0">
                <Shimmer className="h-3 w-24" />
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <Shimmer className="h-16 w-28 sm:h-20 sm:w-36" />
                  <Shimmer className="h-5 w-28" />
                </div>
                <Shimmer className="mt-5 h-8 w-full max-w-xl" />
                <Shimmer className="mt-3 h-8 w-full max-w-lg" />
              </section>
              <section className="rounded-lg border border-[var(--lv-rule)] bg-black/30 p-3">
                <Shimmer className="h-56 w-full rounded-md sm:h-72" />
              </section>
            </div>
            <Shimmer className="mt-6 h-3 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}
