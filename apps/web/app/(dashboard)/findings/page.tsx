import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { FindingsClient } from "./findings-client";

export default async function FindingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <FindingsClient organizationId={orgId} />;
}
