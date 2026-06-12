import { requireUser } from "./auth.js";
import { createUserClient, MembershipRepository } from "@cloudleak/db";
import type { Role } from "@cloudleak/core";

export interface ActiveMembership {
  userId: string;
  organizationId: string;
  role: Role;
}

/** Resolves the signed-in user's first membership (org + role), or null if they have none. */
export async function getActiveMembership(): Promise<ActiveMembership | null> {
  const { user, accessToken } = await requireUser();
  const db = createUserClient(accessToken);
  const memberships = await new MembershipRepository(db).listForUser(user.id);
  const m = memberships[0];
  return m ? { userId: user.id, organizationId: m.organizationId, role: m.role } : null;
}

/** Returns the signed-in user's first organization id, or null if they have none. */
export async function getActiveOrgId(): Promise<string | null> {
  return (await getActiveMembership())?.organizationId ?? null;
}
