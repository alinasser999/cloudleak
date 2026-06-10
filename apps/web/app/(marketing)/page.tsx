"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { AnimatedNumber, EASE_OUT } from "../../components/motion";
import { Sparkline, btnPrimary, btnGhost } from "../../components/ui";
import { StarMotif } from "../../components/star";
import { SmoothScroll } from "../../components/smooth-scroll";
import { CursorField } from "../../components/cursor-field";
import { Magnetic } from "../../components/magnetic";
import { LiveConsole } from "../../components/live-console";
import { TypingCode, type CodeLine } from "../../components/typing-code";
import {
  IconShield,
  IconScan,
  IconCode,
  IconArrowRight,
  IconCheck,
  IconTrendDown,
  IconSparkles,
  IconDollar,
} from "../../components/icons";

// Live WebGL terrain — client-only, sits fixed behind the whole page.
const Terrain = dynamic(() => import("../../components/terrain").then((m) => m.Terrain), {
  ssr: false,
});

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

const TF_LINES: CodeLine[] = [
  { text: "# Release unattached Elastic IP", cls: "text-ink-faint" },
  { text: '- resource "aws_eip" "legacy" {', cls: "text-rose-600" },
  { text: "-   instance = null", cls: "text-rose-600" },
  { text: "- }", cls: "text-rose-600" },
  { text: "+ # removed · saves $3.60/mo", cls: "text-brand-deep" },
];

const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  // Mount-based (not whileInView): a scroll-gated reveal ships blank in headless
  // / non-scrolled renders. This stays visible while still animating in.
  return (
    <motion.div
      className={className}
      variants={reveal}
      initial="hidden"
      animate="show"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <SmoothScroll />
      <Terrain opacity={0.42} />
      <CursorField />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-line/8 bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-xl uppercase tracking-[-0.02em] text-ink">
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
      <section className="relative mx-auto grid max-w-6xl grid-cols-12 items-end gap-8 px-6 pb-16 pt-24 sm:pt-32">
        <span
          aria-hidden="true"
          className="text-stroke pointer-events-none absolute right-4 top-0 hidden font-display text-[15vw] uppercase leading-none tracking-[-0.04em] [writing-mode:vertical-rl] lg:flex lg:h-full lg:items-center"
        >
          Savings
        </span>

        <div className="col-span-12 flex flex-col gap-7 lg:col-span-9">
          <motion.div
            variants={reveal}
            initial="hidden"
            animate="show"
            className="flex items-center gap-4"
          >
            <StarMotif className="text-brand" />
            <span className="meta-label">Precision Cloud Cost Engineering</span>
          </motion.div>

          <motion.h1
            variants={reveal}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.06 }}
            className="font-display text-[clamp(2.6rem,7vw,5.75rem)] uppercase leading-[1.04] tracking-[-0.02em] text-ink"
          >
            Stop Burning Cash
            <br />
            On Idle AWS.
          </motion.h1>

          <motion.p
            variants={reveal}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.12 }}
            className="max-w-2xl text-pretty text-[clamp(1.05rem,1.6vw,1.4rem)] leading-relaxed text-ink-muted"
          >
            CloudLeak scans your account in minutes, finds the waste, and hands you a
            Terraform diff to kill it. Then it tracks every dollar you save.
          </motion.p>

          <motion.div
            variants={reveal}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.18 }}
            className="mt-2 flex flex-col gap-3 sm:flex-row"
          >
            <Magnetic>
              <Link href="/login" className={btnPrimary + " px-6 py-3 text-base"}>
                Run a free audit
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </Magnetic>
            <a href="#how" className={btnGhost + " px-6 py-3 text-base"}>
              See how it works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-2 flex items-center gap-2.5"
          >
            <span className="status-dot" />
            <span className="meta-label">
              Read-only · Cross-account · No access keys
            </span>
          </motion.div>
        </div>
      </section>

      {/* Inside CloudLeak — live product preview */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <Reveal>
          <LiveConsole />
        </Reveal>
      </section>

      {/* Stats band */}
      <section className="relative border-y border-line/10 bg-surface/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-6 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 0.06}
              className={`px-2 py-9 text-center ${i ? "border-line/10 sm:border-l" : ""}`}
            >
              <div className="font-display text-[2.4rem] tabular-nums text-ink sm:text-[3rem]">
                <AnimatedNumber value={s.value} format={s.format} />
              </div>
              <div className="mt-2 meta-label block">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works — method */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid grid-cols-12 gap-8 lg:gap-16">
          <Reveal className="col-span-12 mb-8 h-max lg:sticky lg:top-28 lg:col-span-4 lg:mb-0">
            <div className="flex items-center gap-3">
              <StarMotif className="text-brand" size={20} />
              <span className="meta-label">[01] Operational Protocol</span>
            </div>
            <h2 className="mt-5 font-display text-[clamp(2.2rem,4.5vw,3.5rem)] uppercase leading-[1.08] tracking-[-0.02em] text-ink">
              From Connect To Fix In Three Steps.
            </h2>
            <p className="mt-4 max-w-sm text-ink-muted">
              No agents to install, no access keys to rotate. A read-only role is all
              CloudLeak ever needs.
            </p>
          </Reveal>

          <div className="col-span-12 flex flex-col gap-12 lg:col-span-7 lg:col-start-6 sm:gap-16">
            {STEPS.map((step, i) => (
              <Reveal
                key={step.title}
                delay={i * 0.08}
                className="relative border-l border-brand/60 pl-8 sm:pl-12"
              >
                <div className="absolute -left-[1.15rem] -top-2 bg-canvas p-1.5 font-display text-3xl leading-none text-brand">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/12 text-brand">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-2xl uppercase tracking-[-0.01em] text-ink">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-4 leading-relaxed text-ink-muted">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
        <Reveal className="max-w-2xl">
          <div className="flex items-center gap-3">
            <StarMotif className="text-brand" size={20} />
            <span className="meta-label">[02] What You Get</span>
          </div>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,4.5vw,3.5rem)] uppercase leading-[1.08] tracking-[-0.02em] text-ink">
            Findings You Can Act On.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <Reveal className="lg:row-span-2">
            <div className="relative h-full overflow-hidden rounded-3xl border border-line/10 bg-surface p-7 panel-hairline">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand">
                <IconCode className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-xl uppercase tracking-[-0.01em] text-ink">
                Terraform-Aware Fixes
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Get a copy-paste Terraform diff for each change, so your infrastructure-as-code
                stays the source of truth. Prefer to click? Manual steps ship alongside.
              </p>
              <div className="mt-6 overflow-hidden rounded-xl border border-line/12 bg-surface-raised font-mono text-xs leading-relaxed">
                <div className="flex items-center gap-1.5 border-b border-line/10 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-brand/70" />
                  <span className="ml-2 text-[11px] text-ink-faint">fix.tf</span>
                </div>
                <TypingCode lines={TF_LINES} />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="rounded-3xl border border-line/10 bg-surface p-7 panel-hairline">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand">
                <IconSparkles className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-lg uppercase tracking-[-0.01em] text-ink">
                Actionable Remediation
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Every finding carries a confidence score, a risk score and estimated savings, so
                you know exactly what to change and what it's worth.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="overflow-hidden rounded-3xl border border-line/10 bg-surface p-7 panel-hairline">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand">
                <IconTrendDown className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-lg uppercase tracking-[-0.01em] text-ink">
                Savings Tracking
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Watch projected versus implemented savings climb over time, with executive-ready
                weekly digests.
              </p>
              <Sparkline data={SPARK} className="mt-5 h-12 w-full" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-line/10 bg-surface panel-hairline">
            <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2">
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/12 text-brand">
                  <IconShield className="h-6 w-6" />
                </span>
                <h2 className="mt-6 font-display text-[clamp(2rem,4vw,3rem)] uppercase leading-[1.08] tracking-[-0.02em] text-ink">
                  Least Privilege, By Design.
                </h2>
                <p className="mt-4 max-w-md text-pretty leading-relaxed text-ink-muted">
                  CloudLeak reads your inventory through a scoped, read-only cross-account role.
                  We can describe and list. We can't touch a thing.
                </p>
                <Magnetic className="mt-7">
                  <Link href="/login" className={btnPrimary}>
                    Connect securely
                    <IconArrowRight className="h-4 w-4" />
                  </Link>
                </Magnetic>
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
                    className="flex items-start gap-3 rounded-xl border border-line/10 bg-surface-raised px-4 py-3.5 text-sm text-ink"
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
                      <IconCheck className="h-3 w-3" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Detectors + CTA */}
      <section className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-[clamp(3rem,8vw,6rem)] uppercase leading-[0.98] tracking-[-0.02em] text-brand">
              See What
              <br />
              You&apos;re Wasting.
            </h2>
            <p className="mt-6 max-w-md text-lg text-ink-muted">
              Connect in about two minutes. Your first findings land before your coffee
              gets cold.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Magnetic>
                <Link href="/login" className={btnPrimary + " px-6 py-3 text-base"}>
                  Run a free audit
                  <IconArrowRight className="h-4 w-4" />
                </Link>
              </Magnetic>
              <Link href="/login" className={btnGhost + " px-6 py-3 text-base"}>
                Sign in
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-line/10 bg-surface p-7 panel-hairline">
              <div className="flex items-center gap-2 font-display text-sm uppercase tracking-[-0.01em] text-ink">
                <IconDollar className="h-4 w-4 text-brand" />
                Five ways CloudLeak finds money
              </div>
              <ul className="mt-6 space-y-4">
                {DETECTORS.map((d, i) => (
                  <li key={d} className="flex items-center gap-3 text-sm">
                    <span className="font-display text-base text-brand">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="h-px flex-1 bg-line/12" />
                    <span className="text-right text-ink">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line/10 bg-surface/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm sm:flex-row">
          <span className="font-display text-lg uppercase tracking-[-0.02em] text-ink">
            CloudLeak
          </span>
          <div className="flex items-center gap-2.5">
            <span className="status-dot" />
            <span className="meta-label">Stop wasting money on AWS</span>
          </div>
          <span className="text-ink-faint">© {new Date().getFullYear()} CloudLeak</span>
        </div>
      </footer>
    </div>
  );
}
