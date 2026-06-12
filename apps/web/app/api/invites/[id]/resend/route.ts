import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { InviteService } from "@/server/services/invite-service";
import { handleApiError } from "@/server/api-error-handler";
import { enforceRateLimit } from "@/server/rate-limit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, accessToken } = await requireUser();
    enforceRateLimit(`invite-resend:${user.id}`, { limit: 10, windowMs: 60_000 });
    const { id } = await params;
    const { sent } = await InviteService.resend(accessToken, user.id, id, user.email ?? null);
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return handleApiError(e);
  }
}
