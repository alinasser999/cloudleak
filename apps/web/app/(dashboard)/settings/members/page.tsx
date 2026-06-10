import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveOrgId } from "@/lib/org";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const [{ user }, orgId] = await Promise.all([requireUser(), getActiveOrgId()]);
  if (!orgId) redirect("/onboarding");
  return <MembersClient organizationId={orgId} currentUserId={user.id} />;
}
