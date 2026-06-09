import { NextResponse } from "next/server";
import { BillingService } from "@/server/services/billing-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function POST(req: Request) {
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) throw new ValidationError("Missing stripe-signature header");
    const rawBody = await req.text();
    await BillingService.handleWebhook(rawBody, sig);
    return NextResponse.json({ received: true });
  } catch (e) {
    return handleApiError(e);
  }
}
