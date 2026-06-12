import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ScanService } from "@/server/services/scan-service";
import { handleApiError } from "@/server/api-error-handler";
import { enforceRateLimit } from "@/server/rate-limit";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({
  organizationId: z.string().uuid(),
  awsAccountId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    enforceRateLimit(`scan:${user.id}`, { limit: 10, windowMs: 60_000 });
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId and awsAccountId required");
    const scan = await new ScanService(accessToken).run(
      user.id,
      parsed.data.organizationId,
      parsed.data.awsAccountId,
    );
    return NextResponse.json({ scan }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const orgId = new URL(req.url).searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId query param required");
    const scans = await new ScanService(accessToken).list(user.id, orgId);
    return NextResponse.json({ scans });
  } catch (e) {
    return handleApiError(e);
  }
}
