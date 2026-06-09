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
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/30">Error</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm text-ink/55">
        An unexpected error occurred. Try again, and if it keeps happening, contact support.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Try again
        </button>
        <a
          href="/overview"
          className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5"
        >
          Back to dashboard
        </a>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-[11px] text-ink/30">ref: {error.digest}</p>
      )}
    </div>
  );
}
