"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ToastProvider } from "../../components/toast";
import {
  IconDashboard,
  IconScan,
  IconServer,
  IconAlert,
  IconReport,
  IconCloud,
  IconClock,
  IconCard,
  IconLeaf,
  IconMenu,
  IconX,
  IconArrowRight,
} from "../../components/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { href: string; label: string; icon: Icon };

const NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: IconDashboard },
  { href: "/scans", label: "Scans", icon: IconScan },
  { href: "/resources", label: "Resources", icon: IconServer },
  { href: "/findings", label: "Findings", icon: IconAlert },
  { href: "/reports", label: "Reports", icon: IconReport },
];

const SETTINGS_NAV: NavItem[] = [
  { href: "/settings/aws", label: "AWS Accounts", icon: IconCloud },
  { href: "/settings/schedules", label: "Schedules", icon: IconClock },
  { href: "/settings/billing", label: "Billing", icon: IconCard },
];

function NavLink({ href, label, icon: Icon, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        active ? "text-ink" : "text-ink-muted hover:bg-line/5 hover:text-ink"
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-lg border border-brand/25 bg-brand/12"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <Icon className={`relative z-10 h-[18px] w-[18px] ${active ? "text-brand-bright" : ""}`} />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

function NavContent({ isActive }: { isActive: (href: string) => boolean }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/overview" className="flex items-center gap-2 px-3 text-ink">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand-bright">
          <IconLeaf className="h-4 w-4" />
        </span>
        <span className="font-display text-base uppercase tracking-[0.08em]">CloudLeak</span>
      </Link>

      <nav className="mt-7 space-y-1">
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="mt-7">
        <p className="px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Settings
        </p>
        <nav className="mt-2 space-y-1">
          {SETTINGS_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </nav>
      </div>

      {/* Footer CTA */}
      <Link
        href="/scans"
        className="group mt-auto overflow-hidden rounded-xl border border-brand/20 bg-brand/[0.06] p-4 transition-colors hover:bg-brand/[0.1]"
      >
        <p className="text-sm font-semibold text-ink">Spot-check your spend</p>
        <p className="mt-1 text-xs text-ink-muted">Run a fresh scan to surface new waste.</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-bright">
          Run a scan
          <IconArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <div className="flex min-h-dvh">
          {/* Desktop sidebar */}
          <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-line/10 bg-surface/40 px-4 py-6 backdrop-blur-xl md:block">
            <NavContent isActive={isActive} />
          </aside>

          {/* Mobile drawer */}
          <AnimatePresence>
            {drawerOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDrawerOpen(false)}
                  className="fixed inset-0 z-40 bg-canvas/70 backdrop-blur-sm md:hidden"
                  aria-hidden="true"
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 400, damping: 40 }}
                  className="fixed inset-y-0 left-0 z-50 w-64 border-r border-line/10 bg-surface px-4 py-6 md:hidden"
                >
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close navigation menu"
                    className="absolute right-2 top-4 grid h-11 w-11 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-line/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <IconX className="h-5 w-5" />
                  </button>
                  <NavContent isActive={isActive} />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Mobile top bar */}
            <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line/10 bg-canvas/70 px-4 py-3 backdrop-blur-xl md:hidden">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
                className="-ml-1.5 grid h-11 w-11 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-line/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <IconMenu className="h-5 w-5" />
              </button>
              <span className="flex items-center gap-2 text-ink">
                <IconLeaf className="h-4 w-4 text-brand-bright" />
                <span className="font-display text-base uppercase tracking-[0.08em]">CloudLeak</span>
              </span>
            </header>

            <main className="flex-1 px-5 py-7 sm:px-8 sm:py-9">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </ToastProvider>
    </MotionConfig>
  );
}
