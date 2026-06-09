import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { BillingService } from "@/server/services/billing-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({
  organizationId: z.string().uuid(),
  priceId: z.string().min(1),
  returnUrl: z.string().url(),
});

export async function POST(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId, priceId, returnUrl required");
    const url = await new BillingService(accessToken).createCheckout(
      user.id,
      parsed.data.organizationId,
      parsed.data.priceId,
      parsed.data.returnUrl,
    );
    return NextResponse.json({ url });
  } catch (e) {
    return handleApiError(e);
  }
}
