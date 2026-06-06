import { randomBytes } from "node:crypto";
import { createServiceClient, MembershipRepository, InvitationRepository } from "@cloudleak/db";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type Invitation,
  type Role,
} from "@cloudleak/core";

const INVITE_TTL_DAYS = 7;

export class InviteService {
  static async create(
    actorUserId: string,
    organizationId: string,
    email: string,
    role: Role,
  ): Promise<Invitation> {
    const db = createServiceClient();
    const actor = await new MembershipRepository(db).findForUserInOrg(actorUserId, organizationId);
    if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
      throw new ForbiddenError("Only owners/admins can invite");
    }
    if (!email.includes("@")) throw new ValidationError("Invalid email");
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 864e5).toISOString();
    return new InvitationRepository(db).create({
      organizationId,
      email,
      role,
      token,
      expiresAt,
      invitedBy: actorUserId,
    });
  }

  static async accept(
    userId: string,
    userEmail: string,
    token: string,
  ): Promise<{ organizationId: string }> {
    const db = createServiceClient();
    const invites = new InvitationRepository(db);
    const invite = await invites.findByToken(token);
    if (!invite) throw new NotFoundError("Invite not found");
    if (invite.status !== "pending") throw new ValidationError("Invite is no longer valid");
    if (new Date(invite.expiresAt).getTime() < Date.now())
      throw new ValidationError("Invite has expired");
    if (invite.email.toLowerCase() !== userEmail.toLowerCase())
      throw new ForbiddenError("This invite is for a different email");

    const memberships = new MembershipRepository(db);
    const existing = await memberships.findForUserInOrg(userId, invite.organizationId);
    if (!existing) await memberships.create(invite.organizationId, userId, invite.role);
    await invites.markAccepted(invite.id);
    return { organizationId: invite.organizationId };
  }
}
