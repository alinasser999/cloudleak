import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { ResourcesClient } from "./resources-client";

export default async function ResourcesPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <ResourcesClient organizationId={orgId} />;
}
