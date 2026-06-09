"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ToastProvider } from "../../components/toast";

const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/scans", label: "Scans" },
  { href: "/resources", label: "Resources" },
  { href: "/findings", label: "Findings" },
  { href: "/reports", label: "Reports" },
];

const SETTINGS_NAV = [
  { href: "/settings/aws", label: "AWS Accounts" },
  { href: "/settings/schedules", label: "Schedules" },
  { href: "/settings/billing", label: "Billing" },
];

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative block rounded-md px-2 py-1.5 text-sm font-medium transition-colors duration-150 ${
        active ? "text-ink" : "text-ink/55 hover:text-ink hover:bg-ink/[0.04]"
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-md bg-brand/10"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {active && (
          <motion.span
            layoutId="nav-active-dot"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
          />
        )}
        {label}
      </span>
    </Link>
  );
}

function NavContent({ isActive }: { isActive: (href: string) => boolean }) {
  return (
    <>
      <Link href="/overview" className="block px-2 text-lg font-semibold text-brand">
        CloudLeak
      </Link>
      <nav className="mt-6 space-y-0.5">
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </nav>
      <div className="mt-6">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-ink/30">
          Settings
        </p>
        <nav className="mt-1 space-y-0.5">
          {SETTINGS_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </nav>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <div className="flex min-h-dvh">
          {/* Desktop sidebar */}
          <aside className="hidden w-56 shrink-0 border-r border-ink/10 px-4 py-6 md:block">
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
                  className="fixed inset-0 z-40 bg-ink/40 md:hidden"
                  aria-hidden="true"
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 400, damping: 40 }}
                  className="fixed inset-y-0 left-0 z-50 w-64 border-r border-ink/10 bg-white px-4 py-6 md:hidden"
                >
                  <NavContent isActive={isActive} />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Mobile top bar */}
            <header className="flex items-center gap-3 border-b border-ink/10 px-4 py-3 md:hidden">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
                className="rounded-md p-1.5 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
              </button>
              <span className="text-base font-semibold text-brand">CloudLeak</span>
            </header>

            <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">
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
