import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client authenticated with the **service role** key.
 *
 * The service role key bypasses Row-Level Security (RLS), which is required
 * for admin write operations (create/update/delete) on tables that only allow
 * per-user access through RLS policies (e.g. `profiles`, `coin_balances`,
 * `coin_transactions`).
 *
 * SECURITY WARNING: The service role key grants full admin access to the
 * database. Exposing it in client-side code is a security risk. This is a
 * stop-gap for the admin dashboard and should be replaced with a server-side
 * API / Supabase Edge Function before production use.
 */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://ihfaoksiurmucryfzfvd.supabase.co';

const SERVICE_ROLE_KEY = 'sb_secret_HR5YZxJ2j0PmWExOQySlTA_hBc_B1Hy';

/** Supabase client that uses the service role key (bypasses RLS). */
export const adminSupabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      // Admin operations are stateless; do not persist a session.
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
