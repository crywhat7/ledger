import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body as { username?: string };
    const normalized = typeof username === "string" ? username.trim().toLowerCase() : "";
    if (!normalized) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const supabase = createServerSupabase();
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
