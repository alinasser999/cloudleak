"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "./motion";
import { Sparkline } from "./ui";
import { IconTrendDown } from "./icons";

const SPARK = [9, 11, 10, 14, 13, 18, 17, 24, 22, 31, 36, 48];

const ROWS = [
  { sev: "bg-rose-500", name: "Stopped EC2 · i-0a8f3", save: "$182" },
  { sev: "bg-amber-500", name: "Unattached EBS · vol-77c1", save: "$64" },
  { sev: "bg-sky-500", name: "Old snapshot · snap-91de", save: "$12" },
];

/**
 * Live product preview: a scan-line sweeps the console; finding rows resolve
 * from "detecting…" to a priced result as it passes, and the savings figure
 * counts up once in view. Static, fully-resolved under reduced-motion.
 */
export function LiveConsole() {
  const reduce = useReducedMotion();
  const [scanned, setScanned] = useState(reduce ? ROWS.length : 0);

  useEffect(() => {
    if (reduce) {
      setScanned(ROWS.length);
      return;
    }
    setScanned(0);
    const id = setInterval(() => {
      setScanned((s) => {
        if (s >= ROWS.length) {
          clearInterval(id);
          return s;
        }
        return s + 1;
      });
    }, 720);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="ring-glow relative overflow-hidden rounded-3xl border border-line/12 bg-surface-raised text-left">
      {/* window chrome */}
      <div className="relative z-10 flex items-center gap-2 border-b border-line/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-rose-400/70" />
        <span className="h-3 w-3 rounded-full bg-amber-300/70" />
        <span className="h-3 w-3 rounded-full bg-brand/70" />
        <span className="ml-3 font-mono text-[11px] text-ink-faint">cloudleak · overview</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand/12 px-2.5 py-1 text-[11px] font-medium text-brand-deep">
          <span className="status-dot" />
          {scanned < ROWS.length ? "scanning" : "live"}
        </span>
      </div>

      {/* scan sweep — vertical teal band travelling the console body */}
      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-20 h-20 bg-gradient-to-b from-transparent via-brand/12 to-transparent"
          initial={{ top: "-15%" }}
          animate={{ top: ["-15%", "100%"] }}
          transition={{ duration: 2.6, ease: "linear", repeat: Infinity, repeatDelay: 0.5 }}
        >
          <span className="absolute inset-x-0 bottom-0 h-px bg-brand/50" />
        </motion.div>
      )}

      <div className="relative z-10 grid gap-4 p-5 sm:grid-cols-5">
        {/* hero savings */}
        <div className="relative overflow-hidden rounded-2xl border border-brand/25 bg-brand/[0.06] p-5 sm:col-span-3">
          <div className="meta-label text-brand-deep">Monthly savings found</div>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-display text-[2.6rem] leading-none tabular-nums text-brand">
              <AnimatedNumber
                value={4820}
                format={(n) => `$${Math.round(n).toLocaleString("en-US")}`}
                duration={1.2}
              />
            </span>
            <span className="mb-1 text-sm text-ink-muted">/mo</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-deep">
            <IconTrendDown className="h-3.5 w-3.5" />
            18% more than last scan
          </div>
          <Sparkline data={SPARK} className="mt-4 h-12 w-full" />
        </div>

        {/* small stats */}
        <div className="grid gap-4 sm:col-span-2">
          <div className="rounded-2xl border border-line/10 bg-surface p-4">
            <div className="meta-label">Open findings</div>
            <div className="mt-2 font-display text-2xl tabular-nums text-ink">
              <AnimatedNumber value={23} duration={1} />
            </div>
          </div>
          <div className="rounded-2xl border border-line/10 bg-surface p-4">
            <div className="meta-label">Resources tracked</div>
            <div className="mt-2 font-display text-2xl tabular-nums text-ink">
              <AnimatedNumber value={411} duration={1.1} />
            </div>
          </div>
        </div>

        {/* finding rows — flip from detecting → priced as the scan passes */}
        <div className="overflow-hidden rounded-2xl border border-line/10 bg-surface sm:col-span-5">
          {ROWS.map((r, i) => {
            const found = i < scanned;
            return (
              <div
                key={r.name}
                className={`flex items-center gap-3 px-4 py-3 text-sm ${i ? "border-t border-line/10" : ""}`}
              >
                <span
                  className={`h-2 w-2 rounded-full transition-colors duration-500 ${
                    found ? r.sev : "bg-line/20"
                  }`}
                />
                <span className="font-mono text-xs text-ink-muted">{r.name}</span>
                {found ? (
                  <motion.span
                    initial={reduce ? false : { opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="ml-auto font-display tabular-nums text-brand"
                  >
                    {r.save}/mo
                  </motion.span>
                ) : (
                  <span className="ml-auto font-mono text-[11px] text-ink-faint">
                    detecting<span className="type-dots" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
