/**
 * Best-effort browser → server error reporter, used by the app's error
 * boundaries. Posts to /api/client-error (which forwards to error tracking)
 * with `keepalive` so the beacon survives an unmount or navigation.
 */
export function reportClientError(
  error: { message?: string; stack?: string; digest?: string },
  extra?: { componentStack?: string },
): void {
  try {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        componentStack: extra?.componentStack,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    });
  } catch {
    /* reporting must never throw in an error boundary */
  }
}
