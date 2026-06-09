import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { SchedulesClient } from "./schedules-client";

export default async function SchedulesPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <SchedulesClient organizationId={orgId} />;
}
