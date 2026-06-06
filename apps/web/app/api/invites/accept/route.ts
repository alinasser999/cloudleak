import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { InviteService } from "@/server/services/invite-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  try {
    const { accessToken } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("token required");
    const result = await InviteService.accept(accessToken, parsed.data.token);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
