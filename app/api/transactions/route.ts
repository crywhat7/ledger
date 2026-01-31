import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type TransactionType = "income" | "expense" | "transfer" | "cc_charge" | "cc_payment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      type,
      amount,
      concept,
      account_id,
      to_account_id,
      credit_card_account_id,
      transaction_date,
    } = body as {
      userId?: string;
      type?: TransactionType;
      amount?: number;
      concept?: string;
      account_id?: string;
      to_account_id?: string;
      credit_card_account_id?: string;
      transaction_date?: string;
    };

    if (!userId || !type || amount == null || amount <= 0 || !account_id) {
      return NextResponse.json(
        { error: "userId, type, amount (positive), account_id required" },
        { status: 400 }
      );
    }

    const validTypes: TransactionType[] = ["income", "expense", "transfer", "cc_charge", "cc_payment"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (type === "transfer" && !to_account_id) {
      return NextResponse.json({ error: "to_account_id required for transfer" }, { status: 400 });
    }
    if ((type === "cc_charge" || type === "cc_payment") && !credit_card_account_id) {
      return NextResponse.json(
        { error: "credit_card_account_id required for cc_charge/cc_payment" },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    const { data: account } = await supabase
      .from("accounts")
      .select("id, user_id, balance, type")
      .eq("id", account_id)
      .eq("user_id", userId)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found or not yours" }, { status: 404 });
    }

    let toAccount: { id: string; user_id: string; balance: number } | null = null;
    if (type === "transfer" && to_account_id) {
      const { data } = await supabase
        .from("accounts")
        .select("id, user_id, balance")
        .eq("id", to_account_id)
        .eq("user_id", userId)
        .single();
      if (!data) {
        return NextResponse.json({ error: "To-account not found or not yours" }, { status: 404 });
      }
      toAccount = data;
    }

    let ccAccount: { id: string; user_id: string; balance: number } | null = null;
    if ((type === "cc_charge" || type === "cc_payment") && credit_card_account_id) {
      const { data } = await supabase
        .from("accounts")
        .select("id, user_id, balance")
        .eq("id", credit_card_account_id)
        .eq("user_id", userId)
        .single();
      if (!data) {
        return NextResponse.json({ error: "Credit card account not found or not yours" }, { status: 404 });
      }
      ccAccount = data;
    }

    const date = transaction_date || new Date().toISOString().split("T")[0];

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type,
        amount: Number(amount),
        concept: concept || null,
        account_id,
        to_account_id: type === "transfer" ? to_account_id : null,
        credit_card_account_id: type === "cc_charge" || type === "cc_payment" ? credit_card_account_id : null,
        transaction_date: date,
      })
      .select("id")
      .single();

    if (txError) {
      console.error("transaction insert", txError);
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }

    const numAmount = Number(amount);
    const currentBalance = Number(account.balance);

    if (type === "income") {
      await supabase
        .from("accounts")
        .update({ balance: currentBalance + numAmount })
        .eq("id", account_id);
    } else if (type === "expense") {
      await supabase
        .from("accounts")
        .update({ balance: currentBalance - numAmount })
        .eq("id", account_id);
    } else if (type === "transfer" && toAccount) {
      await supabase
        .from("accounts")
        .update({ balance: currentBalance - numAmount })
        .eq("id", account_id);
      await supabase
        .from("accounts")
        .update({ balance: Number(toAccount.balance) + numAmount })
        .eq("id", to_account_id);
    } else if (type === "cc_charge" && ccAccount) {
      await supabase
        .from("accounts")
        .update({ balance: currentBalance - numAmount })
        .eq("id", account_id);
      await supabase
        .from("accounts")
        .update({ balance: Number(ccAccount.balance) - numAmount })
        .eq("id", credit_card_account_id);
    } else if (type === "cc_payment" && ccAccount) {
      await supabase
        .from("accounts")
        .update({ balance: currentBalance - numAmount })
        .eq("id", account_id);
      await supabase
        .from("accounts")
        .update({ balance: Number(ccAccount.balance) + numAmount })
        .eq("id", credit_card_account_id);
    }

    return NextResponse.json({ id: tx.id });
  } catch (e) {
    console.error("POST /api/transactions", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
