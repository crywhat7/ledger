"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session";
import { supabase } from "@/lib/supabase/client";
import type { Transaction } from "@/types/database";
import type { Account } from "@/types/database";

const TYPE_LABEL: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  cc_charge: "Cargo CC",
  cc_payment: "Pago CC",
};

const TYPE_ICON: Record<string, typeof ArrowUpRight> = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowLeftRight,
  cc_charge: CreditCard,
  cc_payment: CreditCard,
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatCurrency(value: number, type: string) {
  const n = type === "income" ? value : -value;
  const formatted = new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  }).format(Math.abs(n));
  return n >= 0 ? formatted : `-${formatted}`;
}

export default function LedgerPage() {
  const router = useRouter();
  const { session, hydrate } = useSessionStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    async function load() {
      const [txRes, accRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", session.userId)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("accounts")
          .select("id, name")
          .eq("user_id", session.userId),
      ]);
      setTransactions(txRes.data ?? []);
      setAccounts(accRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [session, router]);

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-1 w-24 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full w-1/2 bg-foreground"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  const byDate = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const d = tx.transaction_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="size-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
          </Link>
          <h1 className="font-serif text-xl font-light tracking-tight text-foreground">
            Libro diario
          </h1>
          <div className="size-8" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-border">
              <motion.div
                className="h-full w-1/2 bg-foreground"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              />
            </div>
          </div>
        ) : dates.length === 0 ? (
          <div className="border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">Sin movimientos aún.</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4">
                Ir al inicio
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {dates.map((date) => (
              <section key={date}>
                <h2 className="mb-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {formatDate(date)}
                </h2>
                <ul className="space-y-2">
                  {byDate[date].map((tx) => {
                    const Icon = TYPE_ICON[tx.type] ?? ArrowUpRight;
                    return (
                      <motion.li
                        key={tx.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between border border-border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center border border-border">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {tx.concept || TYPE_LABEL[tx.type]}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {TYPE_LABEL[tx.type]} · {accountName(tx.account_id)}
                              {tx.to_account_id && ` → ${accountName(tx.to_account_id)}`}
                              {tx.credit_card_account_id && ` (${accountName(tx.credit_card_account_id)})`}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`font-serif text-lg tracking-tight ${
                            tx.type === "income" ? "text-foreground" : "text-foreground"
                          }`}
                        >
                          {formatCurrency(tx.amount, tx.type)}
                        </p>
                      </motion.li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
