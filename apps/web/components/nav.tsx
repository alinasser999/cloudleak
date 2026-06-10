"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  type Variants,
} from "framer-motion";
import { btnPrimary } from "./ui";
import { IconArrowRight } from "./icons";

const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Security", href: "#security" },
];

const sheet: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const sheetItem: Variants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

/** Underlined nav link: a clay rule grows from the left on hover / focus. */
function NavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group relative py-1 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none"
    >
      {label}
      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-brand transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100" />
    </a>
  );
}

export function Nav() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 16));

  return (
    <motion.header
      initial={reduce ? false : { y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50"
    >
      <div
        className={`border-b backdrop-blur-xl transition-colors duration-300 ${
          scrolled || open
            ? "border-line/10 bg-canvas/85 shadow-[0_10px_30px_-22px_rgb(42_40_39_/_0.5)]"
            : "border-transparent bg-canvas/55"
        }`}
      >
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between px-6 transition-[padding] duration-300 ${
            scrolled ? "py-2.5" : "py-4"
          }`}
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-display text-xl uppercase tracking-[-0.02em] text-ink"
          >
            <span className="h-2 w-2 rounded-[2px] bg-brand transition-transform duration-300 group-hover:rotate-45" />
            CloudLeak
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:inline-flex"
            >
              Sign in
            </Link>
            <Link href="/login" className={btnPrimary + " hidden sm:inline-flex"}>
              Run free audit
              <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {/* Mobile menu toggle — two bars that cross into an X */}
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-line/15 bg-surface text-ink transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 md:hidden"
            >
              <motion.span
                className="absolute h-0.5 w-5 rounded-full bg-ink"
                animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
              />
              <motion.span
                className="absolute h-0.5 w-5 rounded-full bg-ink"
                animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-line/10 bg-canvas/95 backdrop-blur-xl md:hidden"
          >
            <motion.nav
              variants={sheet}
              initial="hidden"
              animate="show"
              className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4"
            >
              {LINKS.map((l) => (
                <motion.a
                  key={l.href}
                  variants={sheetItem}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-line/8 py-3 font-display text-lg uppercase tracking-[-0.01em] text-ink"
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.div variants={sheetItem} className="pt-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className={btnPrimary + " w-full"}
                >
                  Run free audit
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
