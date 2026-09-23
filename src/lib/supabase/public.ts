import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Cookie-freier Anon-Client für öffentliche Katalog-Reads.
 * Ermöglicht unstable_cache ohne Request-Cookies (bessere Cache-Hits).
 */
export function createPublicClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
