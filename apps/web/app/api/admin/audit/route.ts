import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { PlatformService } from "@/server/services/platform-service";
import { handleApiError } from "@/server/api-error-handler";

export async function GET() {
  try {
    const { accessToken } = await requirePlatformAdmin();
    return NextResponse.json({ events: await new PlatformService(accessToken).getAuditLog() });
  } catch (e) {
    return handleApiError(e);
  }
}
