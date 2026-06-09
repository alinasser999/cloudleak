import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl font-semibold tracking-tight text-brand">404</p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink/55">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/overview"
        className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
