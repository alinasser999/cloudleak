import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { AwsSettings } from "./aws-settings";

export default async function AwsSettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <AwsSettings organizationId={orgId} />;
}
