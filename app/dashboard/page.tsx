"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, LogOut, Settings, BookOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session";
import { IncomeRequiredAlert } from "@/components/IncomeRequiredAlert";
import { BudgetCard } from "@/components/BudgetCard";
import { AccountCard } from "@/components/AccountCard";
import { QuickAddModal } from "@/components/QuickAddModal";
import { AddAccountForm } from "@/components/AddAccountForm";
import type { Account } from "@/types/database";
import { supabase } from "@/lib/supabase/client";
import { playShutterSound } from "@/lib/sound";

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { session, hydrate, logout } = useSessionStore();
  const [showIncomeAlert, setShowIncomeAlert] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState<"income" | "expense" | "transfer" | "cc_charge" | "cc_payment">("expense");
  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadAccounts = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: true });
    setAccounts(data ?? []);
  }, [session]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    loadAccounts();
  }, [session, router, loadAccounts]);

  const today = new Date();
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function handleAddIncome() {
    setShowIncomeAlert(false);
    setQuickAddType("income");
    setShowQuickAdd(true);
  }

  function handleOpenQuickAdd(type: "income" | "expense" | "transfer" | "cc_charge" | "cc_payment" = "expense") {
    setQuickAddType(type);
    setShowQuickAdd(true);
  }

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-serif text-xl font-light tracking-tight text-foreground">
              Ledger
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatDate(today)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSetup(true)}
              className="size-8"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Ajustes</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="size-8">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-sm text-muted-foreground">Bienvenido,</p>
          <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
            {session.displayName || session.username}
          </h2>
        </motion.div>

        {showIncomeAlert && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <IncomeRequiredAlert onAddIncome={handleAddIncome} />
          </motion.div>
        )}

        <section className="mb-8">
          <h3 className="mb-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Este mes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <BudgetCard label="Saldo total" amount={totalBalance} variant="large" />
            <BudgetCard
              label="Disponible diario"
              amount={null}
              sublabel="Disponible para gastar"
            />
            <BudgetCard
              label="Disponible semanal"
              amount={null}
              sublabel="Por semana"
            />
            <BudgetCard
              label="Ingresos"
              amount={null}
              sublabel="Registrados este mes"
            />
            <BudgetCard
              label="Gastos"
              amount={null}
              sublabel="Este mes"
            />
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Cuentas
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AccountCard
                  account={account}
                  onClick={() => handleOpenQuickAdd(account.type === "credit_card" ? "cc_charge" : "expense")}
                />
              </motion.div>
            ))}
          </div>
          {accounts.length === 0 && (
            <div className="border border-dashed border-border py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Sin cuentas. Configuralas en Ajustes.
              </p>
            </div>
          )}
        </section>

        <section className="mb-24">
          <h3 className="mb-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Acceso rápido
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/ledger">
              <Button
                variant="outline"
                className="h-auto w-full flex-col gap-2 bg-transparent py-6"
              >
                <BookOpen className="h-5 w-5" />
                <span className="text-xs">Libro diario</span>
              </Button>
            </Link>
            <Link href="/budget">
              <Button
                variant="outline"
                className="h-auto w-full flex-col gap-2 bg-transparent py-6"
              >
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Presupuesto</span>
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="fixed bottom-6 right-6"
      >
        <Button
          onClick={() => handleOpenQuickAdd("expense")}
          className="size-14 rounded-full bg-foreground text-background shadow-lg hover:bg-foreground/90"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Agregar movimiento</span>
        </Button>
      </motion.div>

      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        defaultType={quickAddType}
        accounts={accounts}
        userId={session.userId}
        onSuccess={loadAccounts}
        playSound={playShutterSound}
      />

      {showSetup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-6"
          onClick={() => setShowSetup(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm border border-border bg-background p-6"
          >
            <h2 className="font-serif text-xl font-light">Ajustes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Agregá una cuenta para empezar a registrar movimientos.
            </p>
            <div className="mt-6">
              <AddAccountForm
                userId={session.userId}
                onSuccess={() => {
                  loadAccounts();
                  setShowSetup(false);
                }}
                onCancel={() => setShowSetup(false)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
