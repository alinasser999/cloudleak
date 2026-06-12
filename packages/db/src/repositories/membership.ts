import type { Db } from "../client.js";
import type { Membership, OrgMember, Role } from "@cloudleak/core";

type MemberJoinRow = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: { email: string; full_name: string | null; avatar_url: string | null } | null;
};

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

  /** Every member of an org, joined to their profile, oldest first (owner usually leads). */
  async listForOrg(organizationId: string): Promise<OrgMember[]> {
    const { data, error } = await this.db
      .from("memberships")
      .select("id, user_id, role, created_at, profiles(email, full_name, avatar_url)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as MemberJoinRow[]).map((d) => ({
      membershipId: d.id,
      userId: d.user_id,
      role: d.role as Role,
      email: d.profiles?.email ?? "",
      fullName: d.profiles?.full_name ?? null,
      avatarUrl: d.profiles?.avatar_url ?? null,
      joinedAt: d.created_at,
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
