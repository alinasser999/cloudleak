import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { OverviewClient } from "./overview-client";

export default async function OverviewPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <OverviewClient organizationId={orgId} />;
}
