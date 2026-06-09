import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { DashboardService } from "@/server/services/dashboard-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const orgId = new URL(req.url).searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId query param required");
    const summary = await new DashboardService(accessToken).getSummary(user.id, orgId);
    return NextResponse.json({ summary });
  } catch (e) {
    return handleApiError(e);
  }
}
