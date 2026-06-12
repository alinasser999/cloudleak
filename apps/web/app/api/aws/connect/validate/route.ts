import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AwsConnectService } from "@/server/services/aws-connect-service";
import { handleApiError } from "@/server/api-error-handler";
import { enforceRateLimit } from "@/server/rate-limit";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({
  organizationId: z.string().uuid(),
  id: z.string().uuid(),
  accountId: z.string().regex(/^\d{12}$/),
  roleArn: z.string().startsWith("arn:aws:iam::"),
});

export async function POST(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    enforceRateLimit(`aws-connect-validate:${user.id}`, { limit: 15, windowMs: 60_000 });
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success)
      throw new ValidationError("organizationId, id, accountId, roleArn required");
    const { organizationId, id, accountId, roleArn } = parsed.data;
    const account = await new AwsConnectService(accessToken).validate(
      user.id,
      organizationId,
      id,
      accountId,
      roleArn,
    );
    return NextResponse.json({ account });
  } catch (e) {
    return handleApiError(e);
  }
}
