import {
  createUserClient,
  MembershipRepository,
  InvitationRepository,
  type Db,
} from "@cloudleak/db";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type OrgMember,
  type Role,
} from "@cloudleak/core";

/**
 * Translate a Postgres error raised by the role-management RPCs into the
 * matching domain error, keyed on the SQLSTATE the functions raise with.
 */
function mapRpcError(error: { code?: string; message: string }): Error {
  switch (error.code) {
    case "42501":
      return new ForbiddenError(error.message);
    case "P0002":
      return new NotFoundError(error.message);
    default:
      return new ValidationError(error.message);
  }
}

export interface PendingInvite {
  id: string;
  email: string;
  role: OrgMember["role"];
  expiresAt: string;
}

export interface TeamView {
  members: OrgMember[];
  pendingInvites: PendingInvite[];
}

/** An organization's team: roster + pending invites, plus role/membership management. */
export class MemberService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private async assertAdmin(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
    if (m.role !== "owner" && m.role !== "admin") {
      throw new ForbiddenError("Only owners and admins can view the team");
    }
  }

  /** Owners and admins may view the roster + pending invites; everyone else is rejected. */
  async listTeam(userId: string, organizationId: string): Promise<TeamView> {
    await this.assertAdmin(userId, organizationId);

    const db = this.db();
    const [members, invites] = await Promise.all([
      new MembershipRepository(db).listForOrg(organizationId),
      new InvitationRepository(db).listPendingForOrg(organizationId),
    ]);

    return {
      members,
      pendingInvites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt,
      })),
    };
  }

  /**
   * Change a member's role. Authority (owner/admin), the role hierarchy, and the
   * "keep at least one owner" rule are all enforced by the update_member_role RPC
   * under the caller's own JWT; we only surface its errors as domain errors.
   */
  async updateMemberRole(membershipId: string, role: Role): Promise<void> {
    const { error } = await this.db().rpc("update_member_role", {
      p_membership_id: membershipId,
      p_role: role,
    });
    if (error) throw mapRpcError(error);
  }

  /** Remove a member from the org. Guardrails are enforced by the remove_member RPC. */
  async removeMember(membershipId: string): Promise<void> {
    const { error } = await this.db().rpc("remove_member", {
      p_membership_id: membershipId,
    });
    if (error) throw mapRpcError(error);
  }
}
