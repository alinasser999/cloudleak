import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { AwsConnectService } from "@/server/services/aws-connect-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const orgId = new URL(req.url).searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId query param required");
    const accounts = await new AwsConnectService(accessToken).list(user.id, orgId);
    return NextResponse.json({ accounts });
  } catch (e) {
    return handleApiError(e);
  }
}
