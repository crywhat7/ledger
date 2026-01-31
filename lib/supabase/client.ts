import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Client-side Supabase (anon key). Untyped to avoid .update()/.insert() inferring `never`. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
