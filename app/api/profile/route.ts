import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** PATCH: update display_name. Auth: Authorization: Bearer <api_key> */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const apiKey = authHeader.slice(7);
    const body = await request.json().catch(() => ({}));
    const { display_name } = body as { display_name?: string };

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (fetchError || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: display_name == null ? null : String(display_name).trim() || null })
      .eq("id", profile.id);

    if (updateError) {
      console.error("profile PATCH", updateError);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/profile", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
