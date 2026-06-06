import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Stop Wasting Money on AWS
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-ink/60">
        Find cloud waste in minutes. Get Terraform-ready fixes. Track savings over time.
      </p>
      <div className="mt-8">
        <Link
          href="/login"
          className="inline-flex rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Run Free Audit
        </Link>
      </div>
    </main>
  );
}
