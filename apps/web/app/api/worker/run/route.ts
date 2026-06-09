import { NextResponse } from "next/server";
import { dispatchDueSchedules, processQueuedScans } from "@/server/worker/run";

// Extend timeout to 60s — requires Vercel Pro. Hobby plan caps at 10s (fake AWS only).
export const maxDuration = 60;

export async function POST(req: Request) {
  // Vercel sets Authorization: Bearer <CRON_SECRET> on cron invocations.
  // When called manually, pass the same header.
  const secret = process.env.CRON_SECRET;
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (!secret) {
    // Fail closed in production: an unprotected worker endpoint lets anyone
    // trigger scans (cost/abuse). Only allow the no-secret path in local dev.
    if (isProd) {
      console.error("[cron] CRON_SECRET not set — refusing to run in production");
      return NextResponse.json({ error: "Worker not configured" }, { status: 503 });
    }
  } else {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [dispatched, processed] = await Promise.all([
    dispatchDueSchedules(),
    processQueuedScans(3),
  ]);

  console.log(`[cron] dispatched=${dispatched} processed=${processed}`);
  return NextResponse.json({ ok: true, dispatched, processed });
}

// Also accept GET so Vercel's cron health check works
export async function GET(req: Request) {
  return POST(req);
}
