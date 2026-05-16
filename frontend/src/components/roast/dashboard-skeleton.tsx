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
          <Shimmer className="h-3 w-28" />
          <Shimmer className="mt-6 h-5 w-full max-w-md" />
          <Shimmer className="mt-3 h-5 w-full max-w-sm" />
          <Shimmer className="mt-10 h-3 w-36" />
          <Shimmer className="mt-4 h-64 w-full max-w-md rounded-lg" />
          <Shimmer className="mt-6 h-10 w-full max-w-md" />
          <Shimmer className="mt-10 h-3 w-40" />
          <div className="mt-4 space-y-3">
            <Shimmer className="h-28 w-full rounded-lg" />
            <Shimmer className="h-28 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
