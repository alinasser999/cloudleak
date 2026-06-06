import Link from "next/link";

const FEATURES = [
  {
    title: "Actionable remediation",
    body: "Every finding ships with a confidence score, risk score, estimated savings, and exactly what to change — not just a chart.",
  },
  {
    title: "Terraform-aware fixes",
    body: "Get a copy-paste Terraform diff for the change, so your infra-as-code stays the source of truth.",
  },
  {
    title: "Savings tracking",
    body: "Track projected vs. implemented savings over time, with executive-ready weekly reports.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold text-brand">CloudLeak</span>
        <Link
          href="/login"
          className="text-sm font-medium text-ink/70 hover:text-ink"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-20 text-center sm:py-28">
          <span className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-dark">
            For startups spending $500–$20k/mo on AWS
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Stop Wasting Money on AWS
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink/60">
            Find cloud waste in minutes. Get Terraform-ready fixes. Track savings over time.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Run Free Audit
            </Link>
            <a
              href="#how"
              className="inline-flex rounded-lg border border-ink/15 px-6 py-3 text-sm font-semibold hover:bg-ink/5"
            >
              How it works
            </a>
          </div>
          <p className="mt-4 text-xs text-ink/40">
            Connect with a read-only cross-account role. We never ask for access keys.
          </p>
        </section>

        <section id="how" className="grid gap-6 pb-24 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-ink/10 p-6">
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-ink/60">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-ink/10">
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-ink/40">
          © {new Date().getFullYear()} CloudLeak
        </div>
      </footer>
    </div>
  );
}
