import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { PlatformService } from "@/server/services/platform-service";
import { handleApiError } from "@/server/api-error-handler";

export async function GET() {
  try {
    const { accessToken } = await requirePlatformAdmin();
    return NextResponse.json({
      organizations: await new PlatformService(accessToken).listOrganizations(),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
