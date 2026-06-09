import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { FindingService } from "@/server/services/finding-service";
import { handleApiError } from "@/server/api-error-handler";

const PatchBody = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(["open", "dismissed"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, accessToken } = await requireUser();
    const { id } = await params;
    const body = PatchBody.parse(await req.json());
    const finding = await new FindingService(accessToken).setStatus(
      id,
      user.id,
      body.organizationId,
      body.status,
    );
    return NextResponse.json({ finding });
  } catch (e) {
    return handleApiError(e);
  }
}
