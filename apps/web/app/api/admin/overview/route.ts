import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { PlatformService } from "@/server/services/platform-service";
import { handleApiError } from "@/server/api-error-handler";

export async function GET() {
  try {
    await requirePlatformAdmin();
    return NextResponse.json(await new PlatformService().getOverview());
  } catch (e) {
    return handleApiError(e);
  }
}
