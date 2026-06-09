import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ScheduleService } from "@/server/services/schedule-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const orgId = new URL(req.url).searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId required");
    const schedules = await new ScheduleService(accessToken).list(user.id, orgId);
    return NextResponse.json({ schedules });
  } catch (e) {
    return handleApiError(e);
  }
}

const PutBody = z.object({
  organizationId: z.string().uuid(),
  awsAccountId: z.string().uuid(),
  frequency: z.enum(["off", "daily", "weekly"]),
  enabled: z.boolean(),
});

export async function PUT(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const parsed = PutBody.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId, awsAccountId, frequency, enabled required");
    const schedule = await new ScheduleService(accessToken).upsert(
      user.id,
      parsed.data.organizationId,
      parsed.data.awsAccountId,
      parsed.data.frequency,
      parsed.data.enabled,
    );
    return NextResponse.json({ schedule });
  } catch (e) {
    return handleApiError(e);
  }
}
