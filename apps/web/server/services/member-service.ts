import {
  createUserClient,
  MembershipRepository,
  InvitationRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, type OrgMember } from "@cloudleak/core";

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

/** Read-only view of an organization's team: active members + pending invites. */
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
}
