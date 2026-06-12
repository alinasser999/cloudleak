import { NextResponse } from "next/server";
import { createServiceClient } from "@cloudleak/db";

export const dynamic = "force-dynamic";

/**
 * Readiness probe: verifies the app can actually reach its dependencies.
 *
 * Kept separate from /api/health (the ALB liveness probe, which must stay cheap
 * and dependency-free so a transient DB blip doesn't cause the load balancer to
 * recycle otherwise-healthy tasks). Point uptime monitoring at this endpoint.
 */
export async function GET() {
  const started = Date.now();
  try {
    // Cheapest possible round-trip to Postgres via PostgREST: a head/count query
    // that transfers no rows. Confirms connectivity + service-role auth.
    const { error } = await createServiceClient()
      .from("organizations")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, db: "up", latencyMs: Date.now() - started });
  } catch (e) {
    return NextResponse.json(
      { ok: false, db: "down", error: e instanceof Error ? e.message : "unknown" },
      { status: 503 },
    );
  }
}
