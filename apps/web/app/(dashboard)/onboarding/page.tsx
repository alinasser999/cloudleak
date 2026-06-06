import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const orgId = await getActiveOrgId();
  if (orgId) redirect("/settings/aws");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Create your organization</h1>
      <p className="mt-1 text-sm text-ink/60">
        This is where your AWS accounts and findings will live.
      </p>
      <div className="mt-6">
        <OnboardingForm />
      </div>
    </div>
  );
}
