import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/settings/aws", label: "Settings", active: true },
];

const COMING_SOON = ["Overview", "Findings", "Resources", "Reports"];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-ink/10 px-4 py-6">
        <div className="px-2 text-lg font-semibold text-brand">CloudLeak</div>
        <nav className="mt-6 space-y-1 text-sm">
          {COMING_SOON.map((label) => (
            <span
              key={label}
              className="block cursor-not-allowed rounded px-2 py-1.5 text-ink/35"
              title="Coming soon"
            >
              {label}
            </span>
          ))}
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
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
