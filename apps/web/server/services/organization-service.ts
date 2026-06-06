import { createUserClient } from "@cloudleak/db";
import { ValidationError, type Organization, type Plan } from "@cloudleak/core";

export class OrganizationService {
  /**
   * Creates an org and makes the caller its owner, using the caller's own JWT.
   * The insert+membership bootstrap runs inside the `create_organization` SECURITY
   * DEFINER function (RLS-safe; breaks the org/membership chicken-and-egg).
   */
  static async createWithOwner(accessToken: string, name: string): Promise<Organization> {
    const trimmed = name.trim();
    if (trimmed.length < 2) throw new ValidationError("Organization name is too short");
    const db = createUserClient(accessToken);
    const { data, error } = await db.rpc("create_organization", { p_name: trimmed });
    if (error || !data) throw new ValidationError(error?.message ?? "Could not create organization");
    const row = data as { id: string; name: string; plan: string; created_at: string };
    return { id: row.id, name: row.name, plan: row.plan as Plan, createdAt: row.created_at };
  }
}
