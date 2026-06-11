import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { MemberService } from "@/server/services/member-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const PatchBody = z.object({ role: z.enum(["owner", "admin", "member"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const { accessToken } = await requireUser();
    const { membershipId } = await params;
    const parsed = PatchBody.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("role must be owner, admin, or member");
    await new MemberService(accessToken).updateMemberRole(membershipId, parsed.data.role);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const { accessToken } = await requireUser();
    const { membershipId } = await params;
    await new MemberService(accessToken).removeMember(membershipId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
