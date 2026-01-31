import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MASTER_KEY = process.env.VAULT_MASTER_KEY || "213356";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { masterKey } = body as { masterKey?: string };
    if (masterKey !== MASTER_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("list-users error", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ users: data });
  } catch (e) {
    console.error("list-users", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
