"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, CalendarClock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session";
import { supabase } from "@/lib/supabase/client";
import type { Account } from "@/types/database";
import type { IncomeSchedule } from "@/types/database";
import { SettingsAccounts } from "@/components/settings/SettingsAccounts";
import { SettingsIncome } from "@/components/settings/SettingsIncome";
import { SettingsProfile } from "@/components/settings/SettingsProfile";

type Tab = "cuentas" | "ingresos" | "perfil";

export default function SettingsPage() {
  const router = useRouter();
  const { session, hydrate } = useSessionStore();
  const [tab, setTab] = useState<Tab>("cuentas");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeSchedules, setIncomeSchedules] = useState<IncomeSchedule[]>([]);
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
      const [accRes, incRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", session.userId).order("created_at", { ascending: true }),
        supabase.from("income_schedules").select("*").eq("user_id", session.userId).order("day_of_month"),
      ]);
      setAccounts(accRes.data ?? []);
      setIncomeSchedules(incRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [session, router]);

  const refreshAccounts = async () => {
    if (!session) return;
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: true });
    setAccounts(data ?? []);
  };

  const refreshIncome = async () => {
    if (!session) return;
    const { data } = await supabase
      .from("income_schedules")
      .select("*")
      .eq("user_id", session.userId)
      .order("day_of_month");
    setIncomeSchedules(data ?? []);
  };

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

  const tabs: { id: Tab; label: string; icon: typeof Wallet }[] = [
    { id: "cuentas", label: "Cuentas", icon: Wallet },
    { id: "ingresos", label: "Ingresos", icon: CalendarClock },
    { id: "perfil", label: "Perfil", icon: User },
  ];

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
            Ajustes
          </h1>
          <div className="size-8" />
        </div>
      </header>

      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-2xl gap-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-[11px] uppercase tracking-wider transition-colors ${
                tab === id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>

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
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "cuentas" && (
              <SettingsAccounts
                userId={session.userId}
                accounts={accounts}
                onRefresh={refreshAccounts}
              />
            )}
            {tab === "ingresos" && (
              <SettingsIncome
                userId={session.userId}
                accounts={accounts}
                incomeSchedules={incomeSchedules}
                onRefresh={refreshIncome}
              />
            )}
            {tab === "perfil" && (
              <SettingsProfile
                session={session}
                onUpdate={() => hydrate()}
              />
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
