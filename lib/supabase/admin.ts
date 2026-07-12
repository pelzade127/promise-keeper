import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client using the SERVICE ROLE key. This bypasses Row Level Security
 * entirely, so it must only ever be used in server-only code (actions, route
 * handlers) — never imported into anything that runs in the browser.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (from Supabase → Settings → API).
 * Without it, functions using this client will throw a clear error rather
 * than silently failing.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Password reset via security question requires it (Supabase → Settings → API → service_role key).",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
