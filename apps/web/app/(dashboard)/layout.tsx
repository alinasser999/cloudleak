import Link from "next/link";
import type { ReactNode } from "react";

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

const COMING_SOON: string[] = [];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-ink/10 px-4 py-6">
        <div className="px-2 text-lg font-semibold text-brand">CloudLeak</div>
        <nav className="mt-6 space-y-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-2 py-1.5 font-medium text-ink hover:bg-ink/5"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-ink/30">
            Settings
          </p>
          <nav className="mt-1 space-y-1 text-sm">
            {SETTINGS_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded px-2 py-1.5 font-medium text-ink hover:bg-ink/5"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
