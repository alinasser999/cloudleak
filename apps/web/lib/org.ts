import { requireUser } from "./auth.js";
import { createUserClient, MembershipRepository } from "@cloudleak/db";

/** Returns the signed-in user's first organization id, or null if they have none. */
export async function getActiveOrgId(): Promise<string | null> {
  const { user, accessToken } = await requireUser();
  const db = createUserClient(accessToken);
  const memberships = await new MembershipRepository(db).listForUser(user.id);
  return memberships[0]?.organizationId ?? null;
}
