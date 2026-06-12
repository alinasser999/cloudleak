import { randomBytes } from "node:crypto";
import {
  createUserClient,
  MembershipRepository,
  InvitationRepository,
  OrganizationRepository,
} from "@cloudleak/db";
import {
  ForbiddenError,
  ValidationError,
  PlanLimitError,
  planLimits,
  PLAN_LABEL,
  type Invitation,
  type Role,
} from "@cloudleak/core";
import { sendEmail, inviteEmailHtml, appUrl } from "../email.js";

const INVITE_TTL_DAYS = 7;

export class InviteService {
  static async create(
    accessToken: string,
    actorUserId: string,
    organizationId: string,
    email: string,
    role: Role,
    inviterEmail: string | null = null,
  ): Promise<Invitation> {
    const db = createUserClient(accessToken);
    const actor = await new MembershipRepository(db).findForUserInOrg(actorUserId, organizationId);
    if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
      throw new ForbiddenError("Only owners/admins can invite");
    }
    if (!email.includes("@")) throw new ValidationError("Invalid email");

    // Enforce the plan's seat quota: active members + pending invitations.
    const invitationRepo = new InvitationRepository(db);
    const [org, members, pending] = await Promise.all([
      new OrganizationRepository(db).getById(organizationId),
      new MembershipRepository(db).listForOrg(organizationId),
      invitationRepo.listPendingForOrg(organizationId),
    ]);
    const limit = planLimits(org.plan).maxSeats;
    if (members.length + pending.length >= limit) {
      throw new PlanLimitError(
        `Your ${PLAN_LABEL[org.plan]} plan includes ${limit} seats (members + pending invites). Upgrade to add more.`,
      );
    }

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 864e5).toISOString();
    const invite = await invitationRepo.create({
      organizationId,
      email,
      role,
      token,
      expiresAt,
      invitedBy: actorUserId,
    });

    // Deliver the invite email. Best-effort: the invitation already exists and the
    // link is shareable from the UI, so a transport failure must not fail the call.
    try {
      await sendEmail({
        to: email,
        subject: `You're invited to ${org.name} on CloudLeak`,
        html: inviteEmailHtml({
          orgName: org.name,
          inviterEmail,
          role,
          acceptUrl: appUrl(`/invite/${token}`),
          expiresAt,
        }),
      });
    } catch (e) {
      console.error("[invite-service] invite email failed (invite still created):", e);
    }

    return invite;
  }

  /** Accepts via the accept_invite SECURITY DEFINER RPC (caller isn't a member yet). */
  static async accept(accessToken: string, token: string): Promise<{ organizationId: string }> {
    const db = createUserClient(accessToken);
    const { data, error } = await db.rpc("accept_invite", { p_token: token });
    if (error || !data) throw new ValidationError(error?.message ?? "Could not accept invite");
    return { organizationId: data as string };
  }
}
