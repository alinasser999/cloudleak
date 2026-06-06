import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { ScansClient } from "./scans-client";

export default async function ScansPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <ScansClient organizationId={orgId} />;
}
