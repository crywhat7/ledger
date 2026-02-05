import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body as { userId?: string };
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    await supabase.from("push_subscriptions").delete().eq("user_id", userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/notifications/unsubscribe", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
