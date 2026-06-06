import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.generated.js";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type Db = SupabaseClient<Database>;

/** Service-role client — bypasses RLS. Server-only. Never import in client components. */
export function createServiceClient(): Db {
  return createClient<Database>(url(), service(), {
    auth: { persistSession: false },
  });
}

/** Anon client bound to a user access token — RLS enforced as that user. */
export function createUserClient(accessToken: string): Db {
  return createClient<Database>(url(), anon(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
}
