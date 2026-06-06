import { getServerSupabase } from "./supabase/server.js";
import { ForbiddenError } from "@cloudleak/core";

/** Resolves the signed-in user and their access token, or throws ForbiddenError. */
export async function requireUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ForbiddenError("Not authenticated");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { user, accessToken: session?.access_token ?? "" };
}
