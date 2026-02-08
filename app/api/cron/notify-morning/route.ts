import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { sendPushNotification, isPushConfigured } from "@/lib/push";
import { getDisposableForUser } from "@/lib/notification-data";

function checkCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  const supabase = createServerSupabase();
  const { data: subs, error: subError } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh_key, auth_key");

  if (subError || !subs?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const utc = new Date();
  const hondurasNow = new Date(utc.getTime() - 6 * 60 * 60 * 1000);
  const format = (n: number) =>
    new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(n);
  let sent = 0;

  for (const sub of subs) {
    try {
      const { dailyDisposable } = await getDisposableForUser(supabase, sub.user_id, hondurasNow);
      await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
        },
        {
          title: "Disponible hoy",
          body: `${format(dailyDisposable)} para gastar hoy.`,
          url: "/dashboard",
        }
      );
      sent++;
    } catch (e) {
      console.error("notify-morning for user", sub.user_id, e);
    }
  }

  return NextResponse.json({ sent });
}
