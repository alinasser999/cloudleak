import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { PlatformService } from "@/server/services/platform-service";
import { handleApiError } from "@/server/api-error-handler";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { accessToken } = await requirePlatformAdmin();
    const { id } = await params;
    const user = await new PlatformService(accessToken).getUser(id);
    if (!user) return NextResponse.json({ error: { message: "User not found" } }, { status: 404 });
    return NextResponse.json({ user });
  } catch (e) {
    return handleApiError(e);
  }
}
