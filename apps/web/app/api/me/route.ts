import { NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/org";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { handleApiError } from "@/server/api-error-handler";

/** Lightweight identity endpoint for the client shell: the caller's active org + role. */
export async function GET() {
  try {
    const [membership, platformAdmin] = await Promise.all([
      getActiveMembership(),
      isPlatformAdmin(),
    ]);
    return NextResponse.json({
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
      isPlatformAdmin: platformAdmin,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
