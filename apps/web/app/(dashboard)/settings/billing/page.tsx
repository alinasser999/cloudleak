import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <BillingClient organizationId={orgId} />;
}
