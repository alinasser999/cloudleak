import { NextResponse } from "next/server";
import { captureException } from "@/server/observability";
import { enforceRateLimit } from "@/server/rate-limit";

interface ClientErrorBody {
  message?: string;
  stack?: string;
  digest?: string;
  url?: string;
  componentStack?: string;
}

/**
 * Receives browser-side errors from the app's error boundaries and forwards them
 * to error tracking. Kept unauthenticated (errors can occur before/around auth),
 * so it's capped with a coarse global rate limit to protect the Sentry quota.
 */
export async function POST(req: Request) {
  try {
    enforceRateLimit("client-error", { limit: 120, windowMs: 60_000 });
    const body = (await req.json().catch(() => ({}))) as ClientErrorBody;
    const message = (body.message ?? "Client error").slice(0, 1000);

    await captureException(new Error(message), {
      platform: "javascript",
      tags: { source: "client" },
      extra: {
        stack: body.stack?.slice(0, 8000),
        componentStack: body.componentStack?.slice(0, 8000),
        digest: body.digest,
        url: body.url,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Never surface reporter failures to the browser.
    return NextResponse.json({ ok: false });
  }
}
