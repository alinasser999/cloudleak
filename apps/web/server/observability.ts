/**
 * Dependency-free error capture, compatible with Sentry's ingest (envelope) API.
 *
 * Why not @sentry/nextjs? This keeps the footprint to zero new dependencies and
 * a single choke point — `captureException` — that every error path funnels
 * through. When SENTRY_DSN is set, events are shipped to Sentry over its public
 * envelope endpoint; when it's unset, capture degrades to console logging, so it
 * is always safe to call. If you later want the full SDK (tracing, sourcemaps,
 * breadcrumbs), swap the transport behind this same function.
 */

export interface CaptureContext {
  level?: "error" | "warning" | "fatal";
  /** "node" for server/worker, "javascript" for browser-originated errors. */
  platform?: "node" | "javascript";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

interface NormalizedError {
  name: string;
  message: string;
  stack?: string;
}

function normalize(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return { name: error.name || "Error", message: error.message, stack: error.stack };
  }
  return { name: "Error", message: typeof error === "string" ? error : JSON.stringify(error) };
}

/**
 * Report an error. Always logs; additionally ships to Sentry when configured.
 * Never throws — a failure in the reporter must not break the caller.
 */
export async function captureException(
  error: unknown,
  context: CaptureContext = {},
): Promise<void> {
  const err = normalize(error);
  console.error(`[capture] ${err.name}: ${err.message}`, context.tags ?? "");

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    await shipToSentry(dsn, err, context);
  } catch (e) {
    console.error("[capture] failed to deliver event:", e);
  }
}

function eventId(): string {
  return (globalThis.crypto?.randomUUID() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "");
}

async function shipToSentry(
  dsn: string,
  err: NormalizedError,
  context: CaptureContext,
): Promise<void> {
  const url = new URL(dsn);
  const publicKey = url.username;
  const segments = url.pathname.split("/").filter(Boolean);
  const projectId = segments.pop();
  if (!publicKey || !projectId) return; // malformed DSN — skip silently after logging
  const pathPrefix = segments.length ? `/${segments.join("/")}` : "";
  const ingest = `${url.protocol}//${url.host}${pathPrefix}/api/${projectId}/envelope/`;

  const id = eventId();
  const event = {
    event_id: id,
    timestamp: Date.now() / 1000,
    platform: context.platform ?? "node",
    level: context.level ?? "error",
    environment: process.env.NODE_ENV ?? "production",
    release: process.env.SENTRY_RELEASE,
    exception: { values: [{ type: err.name, value: err.message }] },
    tags: context.tags,
    extra: { ...context.extra, stack: err.stack },
  };

  const body =
    JSON.stringify({ event_id: id, sent_at: new Date().toISOString(), dsn }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(event);

  // Cap the request so error reporting can never hang a serverless invocation.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    await fetch(ingest, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=cloudleak-observability/1.0`,
      },
      body,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
