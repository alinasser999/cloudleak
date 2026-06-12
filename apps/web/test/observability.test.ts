import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { captureException } from "@/server/observability";

const origDsn = process.env.SENTRY_DSN;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  if (origDsn === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = origDsn;
});

describe("captureException", () => {
  it("is a no-op transport when SENTRY_DSN is unset (logs only, never fetches)", async () => {
    delete process.env.SENTRY_DSN;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(captureException(new Error("boom"))).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ships a Sentry envelope to the DSN's ingest endpoint when configured", async () => {
    process.env.SENTRY_DSN = "https://pubkey@o123.ingest.sentry.io/456";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await captureException(new Error("kaboom"), { tags: { source: "test" } });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://o123.ingest.sentry.io/api/456/envelope/");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-Sentry-Auth"]).toContain("sentry_key=pubkey");
    const body = (init as RequestInit).body as string;
    expect(body).toContain('"type":"event"');
    expect(body).toContain("kaboom");
  });

  it("never throws even if the transport fails", async () => {
    process.env.SENTRY_DSN = "https://pubkey@o123.ingest.sentry.io/456";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(captureException(new Error("x"))).resolves.toBeUndefined();
  });
});
