import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { MemberService } from "@/server/services/member-service";
import { handleApiError } from "@/server/api-error-handler";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { accessToken } = await requireUser();
    const { id } = await params;
    await new MemberService(accessToken).revokeInvite(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
