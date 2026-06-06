import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { OrganizationService } from "@/server/services/organization-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({ name: z.string() });

export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("name is required");
    const org = await OrganizationService.createWithOwner(user.id, parsed.data.name);
    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
