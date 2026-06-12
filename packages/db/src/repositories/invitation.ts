import type { Db } from "../client.js";
import type { Invitation, InviteStatus, Role } from "@cloudleak/core";

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  invited_by: string | null;
};

const map = (d: InvitationRow): Invitation => ({
  id: d.id,
  organizationId: d.organization_id,
  email: d.email,
  role: d.role as Role,
  token: d.token,
  status: d.status as InviteStatus,
  expiresAt: d.expires_at,
  invitedBy: d.invited_by,
});

export class InvitationRepository {
  constructor(private readonly db: Db) {}

  async create(input: {
    organizationId: string;
    email: string;
    role: Role;
    token: string;
    expiresAt: string;
    invitedBy: string;
  }): Promise<Invitation> {
    const { data, error } = await this.db
      .from("invitations")
      .insert({
        organization_id: input.organizationId,
        email: input.email,
        role: input.role,
        token: input.token,
        expires_at: input.expiresAt,
        invited_by: input.invitedBy,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return map(data);
  }

  /**
   * Live pending invites for an org, newest first: status is still 'pending' AND
   * the TTL has not lapsed. Invites are never transitioned to an 'expired' status,
   * so the expiry must be enforced here rather than trusted from `status`.
   */
  async listPendingForOrg(organizationId: string): Promise<Invitation[]> {
    const { data, error } = await this.db
      .from("invitations")
      .select()
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(map);
  }

  async getById(id: string): Promise<Invitation | null> {
    const { data } = await this.db.from("invitations").select().eq("id", id).maybeSingle();
    return data ? map(data) : null;
  }

  async findByToken(token: string): Promise<Invitation | null> {
    const { data } = await this.db
      .from("invitations")
      .select()
      .eq("token", token)
      .maybeSingle();
    return data ? map(data) : null;
  }

  async markAccepted(id: string): Promise<void> {
    const { error } = await this.db
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
