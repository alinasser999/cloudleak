import { NextResponse } from "next/server";
import { DomainError } from "@cloudleak/core";

/** Maps thrown domain errors to consistent HTTP JSON responses. */
export function handleApiError(e: unknown): NextResponse {
  if (e instanceof DomainError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message } },
      { status: e.httpStatus },
    );
  }
  console.error("Unhandled API error", e);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong" } },
    { status: 500 },
  );
}
