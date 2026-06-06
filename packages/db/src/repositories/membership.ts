import type { Db } from "../client.js";
import type { Membership, Role } from "@cloudleak/core";

export class MembershipRepository {
  constructor(private readonly db: Db) {}

  async create(organizationId: string, userId: string, role: Role): Promise<Membership> {
    const { data, error } = await this.db
      .from("memberships")
      .insert({ organization_id: organizationId, user_id: userId, role })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      role: data.role as Role,
    };
  }

  async listForUser(userId: string): Promise<Membership[]> {
    const { data, error } = await this.db
      .from("memberships")
      .select()
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => ({
      id: d.id,
      organizationId: d.organization_id,
      userId: d.user_id,
      role: d.role as Role,
    }));
  }

  async findForUserInOrg(userId: string, organizationId: string): Promise<Membership | null> {
    const { data } = await this.db
      .from("memberships")
      .select()
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    return data
      ? {
          id: data.id,
          organizationId: data.organization_id,
          userId: data.user_id,
          role: data.role as Role,
        }
      : null;
  }
}
