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

  private async assertMember(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
  }

  /** Any member of the org may view its roster; non-members are rejected. */
  async listTeam(userId: string, organizationId: string): Promise<TeamView> {
    await this.assertMember(userId, organizationId);

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
