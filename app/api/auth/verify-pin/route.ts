import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { scryptSync, timingSafeEqual } from "crypto";

const PIN_SALT = process.env.PIN_HASH_SALT || "ledger-pin-default-change-in-production";

function hashPin(pin: string): string {
  const salt = Buffer.from(PIN_SALT, "utf8");
  const key = scryptSync(pin, salt, 64);
  return key.toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, pin } = body as { username?: string; pin?: string };
    if (!username || !pin || typeof pin !== "string" || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, pin_hash, display_name, api_key")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("verify-pin error", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const expectedHash = profile.pin_hash;
    const actualHash = hashPin(pin);
    if (expectedHash.length !== actualHash.length || !timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(actualHash, "hex"))) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    return NextResponse.json({
      userId: profile.id,
      username: profile.username,
      displayName: profile.display_name ?? null,
      apiKey: (profile as { api_key?: string | null }).api_key ?? null,
    });
  } catch (e) {
    console.error("verify-pin", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
