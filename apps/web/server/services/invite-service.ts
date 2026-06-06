import { randomBytes } from "node:crypto";
import { createUserClient, MembershipRepository, InvitationRepository } from "@cloudleak/db";
import { ForbiddenError, ValidationError, type Invitation, type Role } from "@cloudleak/core";

const INVITE_TTL_DAYS = 7;

export class InviteService {
  static async create(
    accessToken: string,
    actorUserId: string,
    organizationId: string,
    email: string,
    role: Role,
  ): Promise<Invitation> {
    const db = createUserClient(accessToken);
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

  /** Accepts via the accept_invite SECURITY DEFINER RPC (caller isn't a member yet). */
  static async accept(accessToken: string, token: string): Promise<{ organizationId: string }> {
    const db = createUserClient(accessToken);
    const { data, error } = await db.rpc("accept_invite", { p_token: token });
    if (error || !data) throw new ValidationError(error?.message ?? "Could not accept invite");
    return { organizationId: data as string };
  }
}
