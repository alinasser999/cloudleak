import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <ReportsClient organizationId={orgId} />;
}
