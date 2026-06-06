import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AwsConnectService } from "@/server/services/aws-connect-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({ organizationId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId required");
    const result = await new AwsConnectService().init(user.id, parsed.data.organizationId);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
