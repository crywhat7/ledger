import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isPushConfigured } from "@/lib/push";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription } = body as {
      userId?: string;
      subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
    };
    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: "userId and subscription (endpoint, keys.p256dh, keys.auth) required" },
        { status: 400 }
      );
    }
    if (!isPushConfigured()) {
      return NextResponse.json({ error: "Push not configured (VAPID keys)" }, { status: 503 });
    }

    const supabase = createServerSupabase();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("push_subscriptions upsert", error);
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/notifications/subscribe", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
