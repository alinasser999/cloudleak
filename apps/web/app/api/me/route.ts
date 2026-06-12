import { NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/org";
import { handleApiError } from "@/server/api-error-handler";

/** Lightweight identity endpoint for the client shell: the caller's active org + role. */
export async function GET() {
  try {
    const membership = await getActiveMembership();
    return NextResponse.json({
      organizationId: membership?.organizationId ?? null,
      role: membership?.role ?? null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
