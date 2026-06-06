import { randomBytes } from "node:crypto";

/** Cryptographically-random external id used in AWS role trust policies. */
export function generateExternalId(): string {
  return "clk_" + randomBytes(24).toString("base64url");
}
