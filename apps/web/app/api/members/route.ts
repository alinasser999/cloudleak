import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { MemberService } from "@/server/services/member-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const orgId = new URL(req.url).searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId required");
    const team = await new MemberService(accessToken).listTeam(user.id, orgId);
    return NextResponse.json(team);
  } catch (e) {
    return handleApiError(e);
  }
}
