import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/scans", label: "Scans" },
  { href: "/resources", label: "Resources" },
  { href: "/findings", label: "Findings" },
  { href: "/settings/aws", label: "Settings" },
];

const COMING_SOON = ["Overview", "Reports"];

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
          {COMING_SOON.map((label) => (
            <span
              key={label}
              className="block cursor-not-allowed rounded px-2 py-1.5 text-ink/35"
              title="Coming soon"
            >
              {label}
            </span>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
