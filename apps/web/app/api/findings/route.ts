import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { FindingService } from "@/server/services/finding-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const url = new URL(req.url);
    const orgId = url.searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId query param required");
    const findings = await new FindingService(accessToken).list(user.id, orgId);
    return NextResponse.json({ findings });
  } catch (e) {
    return handleApiError(e);
  }
}
