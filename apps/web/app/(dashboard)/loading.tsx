export default function DashboardLoading() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-ink/8" />
        <div className="h-4 w-64 animate-pulse rounded bg-ink/5" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-ink/10 p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-ink/8" />
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-ink/8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border border-ink/10 p-5">
            <div className="h-4 w-32 animate-pulse rounded bg-ink/8" />
            <div className="h-3 w-full animate-pulse rounded bg-ink/5" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-ink/5" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-ink/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
