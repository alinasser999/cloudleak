"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";

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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh">
        <aside className="w-56 shrink-0 border-r border-ink/10 px-4 py-6">
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
        </aside>
        <main className="flex-1 px-8 py-8">
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
    </MotionConfig>
  );
}
