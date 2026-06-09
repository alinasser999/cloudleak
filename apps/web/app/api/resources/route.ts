import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ResourceService } from "@/server/services/resource-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const url = new URL(req.url);
    const orgId = url.searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId query param required");
    const awsAccountId = url.searchParams.get("awsAccountId") ?? undefined;
    const resources = await new ResourceService(accessToken).list(user.id, orgId, { awsAccountId });
    return NextResponse.json({ resources });
  } catch (e) {
    return handleApiError(e);
  }
}
