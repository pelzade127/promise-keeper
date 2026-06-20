import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Bound to the request's cookies so the session travels with each render.
 *
 * Note: in a pure Server Component the cookie `set` is a no-op (you can't write
 * headers mid-render). Session refresh is handled in middleware instead — see
 * lib/supabase/middleware.ts. The try/catch keeps render-time calls safe.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — middleware refreshes instead.
          }
        },
      },
    },
  );
}
