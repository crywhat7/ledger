import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client (service role). Intentionally untyped to avoid
 * strict Database generic inferring `never` for .update()/.insert() in API routes.
 */
export function createServerSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}
