export default function DashboardLoading() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-line/8" />
        <div className="h-4 w-64 animate-pulse rounded bg-line/5" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl border border-line/10 bg-surface/40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-line/10 bg-surface/40 p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-line/8" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-line/8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-line/10 bg-surface/40 p-5">
            <div className="h-4 w-32 animate-pulse rounded bg-line/8" />
            <div className="h-3 w-full animate-pulse rounded bg-line/5" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-line/5" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-line/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
