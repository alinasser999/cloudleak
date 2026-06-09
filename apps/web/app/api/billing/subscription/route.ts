import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { BillingService } from "@/server/services/billing-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const orgId = new URL(req.url).searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId required");
    const data = await new BillingService(accessToken).getSubscription(user.id, orgId);
    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}
