"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import {
  motion,
  MotionConfig,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { AnimatedNumber, EASE_OUT } from "../../components/motion";
import { Sparkline, btnPrimary, btnGhost } from "../../components/ui";
import { StarMotif } from "../../components/star";
import { Nav } from "../../components/nav";
import { RevealText } from "../../components/reveal-text";
import { SmoothScroll } from "../../components/smooth-scroll";
import { ScrollProgress } from "../../components/scroll-progress";
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
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  // Scroll-triggered, fires once. `initial={false}` under reduced-motion keeps
  // content visible with no hidden state; no-JS gets the SSR markup unstyled.
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  // Hero parallax: the monumental vertical "SAVINGS" drifts up and dims as the
  // hero scrolls away, giving the type real depth against the live terrain.
  const { scrollYProgress: heroP } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const savingsY = useTransform(heroP, [0, 1], [0, -160]);
  const savingsOpacity = useTransform(heroP, [0, 0.85], [1, 0.12]);

  // Reading spine: the protocol's left rail fills as the three steps scroll by.
  const { scrollYProgress: stepsP } = useScroll({
    target: stepsRef,
    offset: ["start 75%", "end 55%"],
  });
  const spineScale = useSpring(stepsP, { stiffness: 120, damping: 30, mass: 0.3 });

  const cardHover = reduce
    ? {}
    : {
        whileHover: { y: -4 },
        transition: { type: "spring" as const, stiffness: 300, damping: 24 },
      };

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-dvh overflow-x-clip">
      <SmoothScroll />
      <ScrollProgress />
      <Terrain opacity={0.42} />
      <CursorField />

      {/* Nav */}
      <Nav />

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative mx-auto grid max-w-6xl grid-cols-12 items-end gap-8 px-6 pb-16 pt-24 sm:pt-32"
      >
        <motion.span
          aria-hidden="true"
          style={reduce ? undefined : { y: savingsY, opacity: savingsOpacity }}
          className="text-stroke pointer-events-none absolute right-4 top-0 hidden font-display text-[15vw] uppercase leading-none tracking-[-0.04em] [writing-mode:vertical-rl] lg:flex lg:h-full lg:items-center"
        >
          Savings
        </motion.span>

        <div className="col-span-12 flex flex-col gap-7 lg:col-span-9">
          <RevealText
            as="h1"
            text={"Stop Burning Cash\nOn Idle AWS."}
            stagger={0.07}
            className="font-display text-[clamp(2.6rem,7vw,5.75rem)] uppercase leading-[1.04] tracking-[-0.02em] text-ink"
          />

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
                <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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

      {/* Impact band — one lead figure carries it, three facts support */}
      <section className="relative border-y border-line/10 bg-surface/60">
        <div className="mx-auto grid max-w-6xl items-center gap-x-12 gap-y-8 px-6 py-12 lg:grid-cols-[1.5fr_1fr]">
          <Reveal>
            <div className="meta-label text-brand-deep">{STATS[0]!.label}</div>
            <div className="mt-2 font-display text-[clamp(3rem,7vw,4.75rem)] leading-none tabular-nums text-brand">
              <AnimatedNumber value={STATS[0]!.value} format={STATS[0]!.format} duration={1.4} startOnView />
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
              Idle resources priced and flagged across every account teams have connected.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <dl className="grid grid-cols-3 divide-x divide-line/12">
              {STATS.slice(1).map((s) => (
                <div key={s.label} className="px-4 first:pl-0">
                  <dt className="font-display text-[1.9rem] leading-none tabular-nums text-ink">
                    <AnimatedNumber value={s.value} format={s.format} startOnView />
                  </dt>
                  <dd className="mt-2 meta-label">{s.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* How it works — method */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid grid-cols-12 gap-8 lg:gap-16">
          <Reveal className="col-span-12 mb-8 h-max lg:sticky lg:top-28 lg:col-span-4 lg:mb-0">
            <StarMotif className="text-brand" size={24} />
            <RevealText
              as="h2"
              startOnView
              text={"From Connect To Fix\nIn Three Steps."}
              className="mt-5 font-display text-[clamp(2.2rem,4.5vw,3.5rem)] uppercase leading-[1.08] tracking-[-0.02em] text-ink"
            />
            <p className="mt-4 max-w-sm text-ink-muted">
              No agents to install, no access keys to rotate. A read-only role is all
              CloudLeak ever needs.
            </p>
          </Reveal>

          <div className="relative col-span-12 lg:col-span-7 lg:col-start-6">
            {/* reading spine: track + scroll-linked clay fill */}
            <span
              aria-hidden="true"
              className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-px bg-line/15"
            />
            <motion.span
              aria-hidden="true"
              style={{ scaleY: reduce ? 1 : spineScale }}
              className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-px origin-top bg-brand"
            />
            <div ref={stepsRef} className="flex flex-col gap-12 pl-8 sm:gap-16 sm:pl-12">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.08} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl leading-none tabular-nums text-brand">
                      {String(i + 1).padStart(2, "0")}
                    </span>
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
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
        <Reveal className="max-w-2xl">
          <StarMotif className="text-brand" size={24} />
          <RevealText
            as="h2"
            startOnView
            text="Findings You Can Act On."
            className="mt-5 font-display text-[clamp(2.2rem,4.5vw,3.5rem)] uppercase leading-[1.08] tracking-[-0.02em] text-ink"
          />
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <Reveal className="lg:row-span-2">
            <motion.div
              {...cardHover}
              className="relative h-full overflow-hidden rounded-3xl border border-line/10 bg-surface p-7 panel-hairline"
            >
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
            </motion.div>
          </Reveal>

          <Reveal delay={0.06}>
            <motion.div
              {...cardHover}
              className="rounded-3xl border border-line/10 bg-surface p-7 panel-hairline"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand">
                <IconSparkles className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-lg uppercase tracking-[-0.01em] text-ink">
                Actionable Remediation
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Every finding carries a confidence score, a risk score and estimated savings, so
                you know exactly what to change and what it&apos;s worth.
              </p>
            </motion.div>
          </Reveal>

          <Reveal delay={0.12}>
            <motion.div
              {...cardHover}
              className="overflow-hidden rounded-3xl border border-line/10 bg-surface p-7 panel-hairline"
            >
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
            </motion.div>
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
                <RevealText
                  as="h2"
                  startOnView
                  text="Least Privilege, By Design."
                  className="mt-6 font-display text-[clamp(2rem,4vw,3rem)] uppercase leading-[1.08] tracking-[-0.02em] text-ink"
                />
                <p className="mt-4 max-w-md text-pretty leading-relaxed text-ink-muted">
                  CloudLeak reads your inventory through a scoped, read-only cross-account role.
                  We can describe and list. We can&apos;t touch a thing.
                </p>
                <Magnetic className="mt-7">
                  <Link href="/login" className={btnPrimary}>
                    Connect securely
                    <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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
            <RevealText
              as="h2"
              startOnView
              stagger={0.08}
              text={"See What\nYou're Wasting."}
              className="font-display text-[clamp(3rem,8vw,6rem)] uppercase leading-[0.98] tracking-[-0.02em] text-brand"
            />
            <p className="mt-6 max-w-md text-lg text-ink-muted">
              Connect in about two minutes. Your first findings land before your coffee
              gets cold.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Magnetic>
                <Link href="/login" className={btnPrimary + " px-6 py-3 text-base"}>
                  Run a free audit
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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
              <motion.ul
                className="mt-6 space-y-4"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-10% 0px" }}
                variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
              >
                {DETECTORS.map((d, i) => (
                  <motion.li
                    key={d}
                    variants={{
                      hidden: { opacity: 0, x: -14 },
                      show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_OUT } },
                    }}
                    className="group flex items-center gap-3 text-sm"
                  >
                    <span className="font-display text-base text-brand transition-colors group-hover:text-brand-deep">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="h-px flex-1 origin-left bg-line/12 transition-colors duration-300 group-hover:bg-brand/40" />
                    <span className="text-right text-ink">{d}</span>
                  </motion.li>
                ))}
              </motion.ul>
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
    </MotionConfig>
  );
}
