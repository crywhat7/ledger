import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("push_subscriptions select", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    return NextResponse.json({ enabled: Boolean(data) });
  } catch (e) {
    console.error("GET /api/notifications/status", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
