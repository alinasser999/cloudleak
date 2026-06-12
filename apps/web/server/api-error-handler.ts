import { NextResponse } from "next/server";
import { DomainError } from "@cloudleak/core";
import { captureException } from "./observability.js";

/** Maps thrown domain errors to consistent HTTP JSON responses. */
export async function handleApiError(e: unknown): Promise<NextResponse> {
  if (e instanceof DomainError) {
    // Expected, client-facing errors (validation, forbidden, rate-limit, …) —
    // these are normal control flow, so they are not reported to error tracking.
    return NextResponse.json(
      { error: { code: e.code, message: e.message } },
      { status: e.httpStatus },
    );
  }
  // Unexpected failure: report it before returning an opaque 500.
  await captureException(e, { tags: { source: "api" } });
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong" } },
    { status: 500 },
  );
}
