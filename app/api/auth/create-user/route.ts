import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { scryptSync, randomBytes } from "crypto";
const MASTER_KEY = process.env.VAULT_MASTER_KEY || "213356";
const PIN_SALT = process.env.PIN_HASH_SALT || "ledger-pin-default-change-in-production";

function hashPin(pin: string): string {
  const salt = Buffer.from(PIN_SALT, "utf8");
  const key = scryptSync(pin, salt, 64);
  return key.toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterKey, username, pin } = body as { masterKey?: string; username?: string; pin?: string };
    if (masterKey !== MASTER_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!username || !pin || typeof pin !== "string" || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Username and 6-digit PIN required" }, { status: 400 });
    }

    const normalized = username.trim().toLowerCase();
    if (normalized.length < 2) {
      return NextResponse.json({ error: "Username too short" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const pinHash = hashPin(pin);
    const apiKey = randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("profiles")
      .insert({ username: normalized, pin_hash: pinHash, api_key: apiKey })
      .select("id, username, api_key")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Username already exists" }, { status: 409 });
      console.error("create-user error", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      username: data.username,
      api_key: data.api_key ?? apiKey,
    });
  } catch (e) {
    console.error("create-user", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
