import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body as { username?: string };
    const normalized = typeof username === "string" ? username.trim().toLowerCase() : "";
    if (!normalized) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .maybeSingle();

    if (error) {
      console.error("check-username error", error);
      return NextResponse.json({ exists: false }, { status: 200 });
    }
    return NextResponse.json({ exists: !!data?.id });
  } catch {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}
