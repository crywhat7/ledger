import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { sendPushNotification, isPushConfigured } from "@/lib/push";

/** Envía una notificación de prueba al usuario (para verificar que push funciona). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body as { userId?: string };
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (!isPushConfigured()) {
      return NextResponse.json({ error: "Push not configured (VAPID keys)" }, { status: 503 });
    }

    const supabase = createServerSupabase();
    const { data: sub, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh_key, auth_key")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !sub) {
      return NextResponse.json(
        { error: "No tenés notificaciones activadas. Activálas en Ajustes → Perfil." },
        { status: 404 }
      );
    }

    await sendPushNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
      },
      {
        title: "Prueba de Ledger",
        body: "Si ves esto, las notificaciones push funcionan correctamente.",
        url: "/dashboard",
      }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/notifications/test", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al enviar la notificación" },
      { status: 500 }
    );
  }
}
