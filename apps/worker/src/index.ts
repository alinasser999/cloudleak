import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env.local from monorepo root for local dev (fails silently in production)
try {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env.local");
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    const key = m?.[1];
    const raw = m?.[2] ?? "";
    if (key) process.env[key] ??= raw.replace(/^["']|["']$/g, "");
  }
} catch {
  // Production: env vars are injected externally (Docker, Fargate, etc.)
}

import { createServiceClient, ScanRepository } from "@cloudleak/db";
import { processScan } from "./processor.js";
import { pollSchedules } from "./scheduler.js";
// Note: apps/web/server/worker/run.ts contains equivalent logic for the Vercel cron route.

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? "3000");

console.log(`[worker] starting — poll interval ${POLL_MS}ms`);
if (process.env.CLOUDLEAK_FAKE_AWS === "1") {
  console.log("[worker] CLOUDLEAK_FAKE_AWS=1 — using fake AWS client");
}

async function poll(): Promise<void> {
  const db = createServiceClient();
  const queued = await new ScanRepository(db).listQueued();
  if (queued.length === 0) return;

  console.log(`[worker] ${queued.length} queued scan(s) found`);
  for (const scan of queued) {
    console.log(`[worker] processing scan ${scan.id} (account ${scan.awsAccountId})`);
    try {
      await processScan(scan);
      console.log(`[worker] scan ${scan.id} completed`);
    } catch (e) {
      console.error(`[worker] scan ${scan.id} failed:`, e);
    }
  }
}

async function run(): Promise<never> {
  while (true) {
    try {
      await pollSchedules();
    } catch (e) {
      console.error("[worker] scheduler error:", e);
    }
    try {
      await poll();
    } catch (e) {
      console.error("[worker] poll error:", e);
    }
    await new Promise<void>((res) => setTimeout(res, POLL_MS));
  }
}

process.on("SIGINT", () => {
  console.log("[worker] shutting down");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("[worker] shutting down");
  process.exit(0);
});

void run();
