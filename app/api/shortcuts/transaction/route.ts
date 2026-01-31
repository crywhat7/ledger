import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * iOS Shortcuts: POST amount, concept, account_id.
 * Auth: Authorization: Bearer <api_key> (api_key from profiles, set in vault-admin or on first login).
 * If api_key not used yet: send X-User-Id with userId (in-app only, for backwards compat).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const userIdHeader = request.headers.get("x-user-id");
    const body = await request.json().catch(() => ({}));
    const { amount, concept, account_id } = body as { amount?: number; concept?: string; account_id?: string };

    if (amount == null || amount <= 0 || !account_id) {
      return NextResponse.json(
        { error: "amount (positive) and account_id required" },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("api_key", token)
        .maybeSingle();
      if (profile) userId = profile.id;
    }

    if (!userId && userIdHeader) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userIdHeader)
        .maybeSingle();
      if (profile) userId = profile.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: use Authorization: Bearer <api_key> or X-User-Id" }, { status: 401 });
    }

    const { data: account } = await supabase
      .from("accounts")
      .select("id, user_id")
      .eq("id", account_id)
      .eq("user_id", userId)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found or not yours" }, { status: 404 });
    }

    const date = new Date().toISOString().split("T")[0];

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "expense",
        amount: Number(amount),
        concept: concept || "Shortcut",
        account_id,
        transaction_date: date,
      })
      .select("id")
      .single();

    if (txError) {
      console.error("shortcuts transaction", txError);
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }

    const { data: acc } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", account_id)
      .single();

    if (acc) {
      await supabase
        .from("accounts")
        .update({ balance: Number(acc.balance) - Number(amount) })
        .eq("id", account_id);
    }

    return NextResponse.json({ id: tx.id, ok: true });
  } catch (e) {
    console.error("POST /api/shortcuts/transaction", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
