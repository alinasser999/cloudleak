import Link from "next/link";
import { IconArrowRight } from "../components/icons";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-7xl tabular-nums text-brand">404</p>
      <h1 className="mt-4 font-display text-xl uppercase tracking-[0.01em] text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/overview"
        className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-canvas shadow-glow-sm transition-colors hover:bg-brand-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        Back to dashboard
        <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
