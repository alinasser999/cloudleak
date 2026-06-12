import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ReportService } from "@/server/services/report-service";
import { handleApiError } from "@/server/api-error-handler";
import { enforceRateLimit } from "@/server/rate-limit";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({ organizationId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    enforceRateLimit(`digest:${user.id}`, { limit: 5, windowMs: 60_000 });
    if (!user.email) throw new ValidationError("User has no email address");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId required");
    await new ReportService(accessToken).sendDigest(
      user.id,
      parsed.data.organizationId,
      user.email,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
