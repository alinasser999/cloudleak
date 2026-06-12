import { requireUser } from "./auth.js";
import { createUserClient } from "@cloudleak/db";
import { ForbiddenError } from "@cloudleak/core";

/**
 * Whether the signed-in user is a platform super-admin (the "god view" operator).
 * Resolved via the is_platform_admin() SECURITY DEFINER RPC under the caller's own
 * JWT, so it only ever reveals a boolean — the platform_admins table stays locked.
 * Returns false (never throws) so it is safe for nav/page gating.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    const { accessToken } = await requireUser();
    const { data } = await createUserClient(accessToken).rpc("is_platform_admin");
    return data === true;
  } catch {
    return false;
  }
}

/** Asserts platform-admin access for an API route, throwing ForbiddenError otherwise. */
export async function requirePlatformAdmin(): Promise<void> {
  const { accessToken } = await requireUser();
  const { data, error } = await createUserClient(accessToken).rpc("is_platform_admin");
  if (error) throw new ForbiddenError("Could not verify platform access");
  if (data !== true) throw new ForbiddenError("Platform admin access required");
}
