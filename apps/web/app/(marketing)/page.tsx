"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Backdrop } from "../../components/backdrop";
import { AnimatedNumber, EASE_OUT } from "../../components/motion";
import { Sparkline, btnPrimary, btnGhost } from "../../components/ui";
import {
  IconLeaf,
  IconShield,
  IconScan,
  IconCode,
  IconCloud,
  IconArrowRight,
  IconCheck,
  IconTrendDown,
  IconSparkles,
  IconDollar,
} from "../../components/icons";

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const SPARK = [9, 11, 10, 14, 13, 18, 17, 24, 22, 31, 36, 48];

const STEPS = [
  {
    icon: IconShield,
    title: "Connect a read-only role",
    body: "Apply a one-block Terraform snippet that grants CloudLeak a cross-account IAM role with an external ID. We never ask for access keys.",
  },
  {
    icon: IconScan,
    title: "Scan your inventory",
    body: "We walk EC2, EBS, snapshots, Elastic IPs and RDS across your regions, price each resource, and flag what's sitting idle.",
  },
  {
    icon: IconCode,
    title: "Apply the fix",
    body: "Every finding ships with a copy-paste Terraform diff and manual steps, ranked by confidence, risk and dollars saved.",
  },
];

const DETECTORS = [
  "Stopped EC2 instances still billing EBS",
  "Unattached EBS volumes",
  "Aging, redundant snapshots",
  "Unassociated Elastic IPs",
  "Idle and stopped RDS instances",
];

const STATS = [
  { value: 182400, format: usd, label: "Waste surfaced for teams" },
  { value: 5, format: (n: number) => `${n}`, label: "Waste detectors" },
  { value: 2, format: (n: number) => `<${n} min`, label: "To first finding" },
  { value: 0, format: (n: number) => `${n}`, label: "Access keys stored" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-line/5 bg-canvas/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/15 text-brand-bright">
              <IconLeaf className="h-4 w-4" />
            </span>
            CloudLeak
          </span>
          <nav className="hidden items-center gap-7 text-sm text-ink-muted md:flex">
            <a href="#how" className="transition-colors hover:text-ink">How it works</a>
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#security" className="transition-colors hover:text-ink">Security</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
              Sign in
            </Link>
            <Link href="/login" className={btnPrimary + " hidden sm:inline-flex"}>
              Run free audit
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <Backdrop />
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-20 text-center sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="inline-flex items-center gap-2 rounded-full border border-line/15 bg-line/[0.04] px-3.5 py-1.5 text-xs font-medium text-ink-muted"
          >
            <IconShield className="h-3.5 w-3.5 text-brand-bright" />
            Read-only · Cross-account · No access keys
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.05 }}
            className="mx-auto mt-6 max-w-4xl text-balance text-[clamp(2.5rem,6.5vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-ink"
          >
            Stop burning cash on{" "}
            <span className="relative whitespace-nowrap text-brand-bright text-glow">idle AWS.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-ink-muted"
          >
            CloudLeak scans your account in minutes, finds the waste, and hands you a
            Terraform diff to kill it. Then it tracks every dollar you save.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/login" className={btnPrimary + " px-6 py-3 text-base"}>
              Run a free audit
              <IconArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how" className={btnGhost + " px-6 py-3 text-base"}>
              See how it works
            </a>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-4 text-sm text-ink-faint"
          >
            Built for teams spending $500–$20k/mo on AWS.
          </motion.p>

          {/* Product preview */}
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.28 }}
            className="relative mx-auto mt-16 max-w-4xl"
          >
            <div className="absolute inset-x-8 -bottom-6 h-24 rounded-full bg-brand/30 blur-3xl" />
            <HeroPreview />
          </motion.div>
        </div>
      </section>

      {/* Stats band */}
      <section className="relative border-y border-line/5 bg-surface/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 py-2 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.06 }}
              className="px-2 py-8 text-center"
            >
              <div className="font-mono text-3xl font-semibold tabular-nums text-ink sm:text-4xl">
                <AnimatedNumber value={s.value} format={s.format} />
              </div>
              <div className="mt-1.5 text-xs text-ink-muted">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          kicker="How it works"
          title="From connection to Terraform fix in three steps."
          subtitle="No agents to install, no access keys to rotate. A read-only role is all CloudLeak ever needs."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-2xl border border-line/10 bg-surface/50 p-6 panel-hairline"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand-bright">
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-5xl font-semibold leading-none text-line/10">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <SectionHeading
          kicker="What you get"
          title="Findings you can act on, not another dashboard."
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {/* Large: Terraform fix */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            viewport={{ once: true, margin: "-80px" }}
            className="relative overflow-hidden rounded-2xl border border-line/10 bg-surface/60 p-7 panel-hairline lg:row-span-2"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand-bright">
              <IconCode className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">Terraform-aware fixes</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Get a copy-paste Terraform diff for each change, so your infrastructure-as-code
              stays the source of truth. Prefer to click? Manual steps ship alongside.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-line/10 bg-canvas/80 font-mono text-xs leading-relaxed">
              <div className="flex items-center gap-1.5 border-b border-line/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand/70" />
                <span className="ml-2 text-[11px] text-ink-faint">fix.tf</span>
              </div>
              <pre className="overflow-x-auto p-4">
                <span className="text-ink-faint"># Release unattached Elastic IP</span>
                {"\n"}
                <span className="text-rose-300">- resource "aws_eip" "legacy" {"{"}</span>
                {"\n"}
                <span className="text-rose-300">-   instance = null</span>
                {"\n"}
                <span className="text-rose-300">- {"}"}</span>
                {"\n"}
                <span className="text-brand-bright">+ # removed · saves $3.60/mo</span>
              </pre>
            </div>
          </motion.div>

          {/* Actionable remediation */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.06 }}
            className="rounded-2xl border border-line/10 bg-surface/60 p-7 panel-hairline"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand-bright">
              <IconSparkles className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink">Actionable remediation</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Every finding carries a confidence score, a risk score and estimated savings, so
              you know exactly what to change and what it's worth.
            </p>
          </motion.div>

          {/* Savings tracking */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.12 }}
            className="overflow-hidden rounded-2xl border border-line/10 bg-surface/60 p-7 panel-hairline"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand-bright">
              <IconTrendDown className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink">Savings tracking</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Watch projected versus implemented savings climb over time, with executive-ready
              weekly digests.
            </p>
            <Sparkline data={SPARK} className="mt-5 h-12 w-full" />
          </motion.div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-line/10 bg-surface/50 panel-hairline">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
          <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand-bright">
                <IconShield className="h-6 w-6" />
              </span>
              <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-ink">
                Least privilege, by design.
              </h2>
              <p className="mt-3 max-w-md text-pretty leading-relaxed text-ink-muted">
                CloudLeak reads your inventory through a scoped, read-only cross-account role.
                We can describe and list. We can't touch a thing.
              </p>
              <Link href="/login" className={btnPrimary + " mt-7"}>
                Connect securely
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="grid gap-3 self-center">
              {[
                "Cross-account IAM role with a unique external ID",
                "Read-only: scoped to Describe and List actions",
                "Access keys are never requested or stored",
                "Revoke access any time by deleting the role",
              ].map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-xl border border-line/10 bg-canvas/40 px-4 py-3.5 text-sm text-ink"
                >
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/20 text-brand-bright">
                    <IconCheck className="h-3 w-3" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Detectors + CTA */}
      <section className="relative">
        <Backdrop className="opacity-80" />
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                See what you're wasting this month.
              </h2>
              <p className="mt-4 max-w-md text-lg text-ink-muted">
                Connect in about two minutes. Your first findings land before your coffee
                gets cold.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className={btnPrimary + " px-6 py-3 text-base"}>
                  Run a free audit
                  <IconArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className={btnGhost + " px-6 py-3 text-base"}>
                  Sign in
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-line/10 bg-surface/60 p-7 panel-hairline">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <IconDollar className="h-4 w-4 text-brand-bright" />
                Five ways CloudLeak finds money
              </div>
              <ul className="mt-5 space-y-3">
                {DETECTORS.map((d, i) => (
                  <li key={d} className="flex items-center gap-3 text-sm text-ink-muted">
                    <span className="font-mono text-xs text-brand-bright">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="h-px flex-1 bg-line/10" />
                    <span className="text-right text-ink">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-ink-muted sm:flex-row">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <IconLeaf className="h-4 w-4 text-brand-bright" />
            CloudLeak
          </span>
          <span className="text-ink-faint">
            © {new Date().getFullYear()} CloudLeak. Stop wasting money on AWS.
          </span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-2xl text-center"
    >
      <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-brand-bright/80">
        {kicker}
      </span>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-pretty text-ink-muted">{subtitle}</p>}
    </motion.div>
  );
}

function HeroPreview() {
  return (
    <div className="ring-glow relative overflow-hidden rounded-2xl border border-line/15 bg-surface/80 text-left backdrop-blur-xl">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-rose-400/70" />
        <span className="h-3 w-3 rounded-full bg-amber-300/70" />
        <span className="h-3 w-3 rounded-full bg-brand/70" />
        <span className="ml-3 font-mono text-[11px] text-ink-faint">cloudleak · overview</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-medium text-brand-bright">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-bright" />
          live
        </span>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-5">
        {/* hero savings */}
        <div className="relative overflow-hidden rounded-xl border border-brand/30 bg-brand/[0.08] p-5 sm:col-span-3">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand/30 blur-2xl" />
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-bright/80">
            Monthly savings found
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-mono text-4xl font-semibold tabular-nums text-brand-bright text-glow">
              $4,820
            </span>
            <span className="mb-1 text-sm text-ink-muted">/mo</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-bright">
            <IconTrendDown className="h-3.5 w-3.5" />
            18% more than last scan
          </div>
          <Sparkline data={SPARK} className="mt-4 h-12 w-full" animate={false} />
        </div>
        {/* small stats */}
        <div className="grid gap-4 sm:col-span-2">
          <div className="rounded-xl border border-line/10 bg-canvas/50 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted/70">
              Open findings
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">23</div>
          </div>
          <div className="rounded-xl border border-line/10 bg-canvas/50 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted/70">
              Resources tracked
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">411</div>
          </div>
        </div>
        {/* finding rows */}
        <div className="rounded-xl border border-line/10 bg-canvas/40 sm:col-span-5">
          {[
            { sev: "bg-rose-400", name: "Stopped EC2 · i-0a8f3", save: "$182" },
            { sev: "bg-amber-300", name: "Unattached EBS · vol-77c1", save: "$64" },
            { sev: "bg-sky-400", name: "Old snapshot · snap-91de", save: "$12" },
          ].map((r, i) => (
            <div
              key={r.name}
              className={`flex items-center gap-3 px-4 py-3 text-sm ${i ? "border-t border-line/8" : ""}`}
            >
              <span className={`h-2 w-2 rounded-full ${r.sev}`} />
              <span className="font-mono text-xs text-ink-muted">{r.name}</span>
              <span className="ml-auto font-mono font-semibold tabular-nums text-brand-bright">
                {r.save}/mo
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
