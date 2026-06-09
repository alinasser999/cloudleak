import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { OnboardingForm } from "./onboarding-form";
import { IconLeaf, IconCloud, IconScan } from "../../../components/icons";

const NEXT = [
  { icon: IconLeaf, label: "Name your workspace" },
  { icon: IconCloud, label: "Connect a read-only AWS role" },
  { icon: IconScan, label: "Run your first scan" },
];

export default async function OnboardingPage() {
  const orgId = await getActiveOrgId();
  if (orgId) redirect("/settings/aws");

  return (
    <div className="mx-auto max-w-lg py-6">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand-bright">
        <IconLeaf className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
        Create your organization
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        This is where your AWS accounts and findings will live.
      </p>

      <div className="mt-6 rounded-2xl border border-line/10 bg-surface/60 p-6 panel-hairline">
        <OnboardingForm />
      </div>

      <ol className="mt-6 space-y-2.5">
        {NEXT.map((step, i) => (
          <li key={step.label} className="flex items-center gap-3 text-sm text-ink-muted">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-line/8 text-ink-muted">
              <step.icon className="h-4 w-4" />
            </span>
            <span className="font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
