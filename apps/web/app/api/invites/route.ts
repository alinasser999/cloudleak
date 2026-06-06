import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { InviteService } from "@/server/services/invite-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});

export async function POST(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId, email, role required");
    const invite = await InviteService.create(
      accessToken,
      user.id,
      parsed.data.organizationId,
      parsed.data.email,
      parsed.data.role,
    );
    return NextResponse.json(
      { invite: { id: invite.id, email: invite.email, token: invite.token } },
      { status: 201 },
    );
  } catch (e) {
    return handleApiError(e);
  }
}
