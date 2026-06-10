"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-600/80">Error</p>
      <h1 className="mt-3 font-display text-2xl uppercase leading-none tracking-[0.01em] text-ink">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        An unexpected error occurred. Try again, and if it keeps happening, contact support.
      </p>
      <div className="mt-7 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-canvas shadow-glow-sm transition-colors hover:bg-brand-bright"
        >
          Try again
        </button>
        <a
          href="/overview"
          className="rounded-xl border border-line/15 bg-line/[0.03] px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-line/10"
        >
          Back to dashboard
        </a>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-[11px] text-ink-faint">ref: {error.digest}</p>
      )}
    </div>
  );
}
