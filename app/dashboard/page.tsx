"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, LogOut, Settings, BookOpen, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session";
import { useHondurasTimeStore } from "@/store/honduras-time";
import { BudgetCard } from "@/components/BudgetCard";
import { AccountCard } from "@/components/AccountCard";
import { QuickAddModal } from "@/components/QuickAddModal";
import type { Account } from "@/types/database";
import { supabase } from "@/lib/supabase/client";
import { playShutterSound } from "@/lib/sound";
import { getNowHonduras, getHondurasDateString } from "@/lib/honduras-time";
import {
  getActualIncomeInMonth,
  getActualExpensesInMonth,
  getMonthKey,
  getNextPayday,
  getNext15,
  getNext30,
  getDaysUntilNextPayday,
  getWeeksUntilNextPayday,
  getDailyDisposableUntilNextPayday,
  getWeeklyDisposableUntilNextPayday,
} from "@/lib/budget";
import type { IncomeSchedule } from "@/types/database";
import type { Budget } from "@/types/database";
import type { Transaction } from "@/types/database";

/** Fecha en UTC-6 (Honduras) para mostrar en header */
function formatDateHonduras(date: Date) {
  return date.toLocaleDateString("es-HN", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

type ViewMode = "day" | "week";
type PeriodOption = "cobro" | "15" | "30" | "custom";

export default function DashboardPage() {
  const router = useRouter();
  const { session, hydrate, logout } = useSessionStore();
  const { time24, tick } = useHondurasTimeStore();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [periodOption, setPeriodOption] = useState<PeriodOption>("cobro");
  const [customDate, setCustomDate] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState<"income" | "expense" | "transfer" | "cc_charge" | "cc_payment">("expense");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeSchedules, setIncomeSchedules] = useState<IncomeSchedule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [paidThisMonth, setPaidThisMonth] = useState<{ budget_id: string }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: true });
    setAccounts(data ?? []);
  }, [session]);

  const loadBudgetData = useCallback(async () => {
    if (!session) return;
    const now = getNowHonduras();
    const month = getMonthKey(now);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
    const [schedRes, txRes, budgRes, paidRes] = await Promise.all([
      supabase.from("income_schedules").select("*").eq("user_id", session.userId),
      supabase
        .from("transactions")
        .select("id, type, amount, transaction_date")
        .eq("user_id", session.userId)
        .gte("transaction_date", `${month}-01`)
        .lte("transaction_date", endDate),
      supabase.from("budgets").select("*").eq("user_id", session.userId),
      supabase
        .from("budget_month_paid")
        .select("budget_id")
        .eq("user_id", session.userId)
        .eq("month", month),
    ]);
    setIncomeSchedules(schedRes.data ?? []);
    setTransactions(txRes.data as Transaction[] ?? []);
    setBudgets(budgRes.data ?? []);
    setPaidThisMonth(paidRes.data ?? []);
  }, [session]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tick]);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    loadAccounts();
    loadBudgetData();
  }, [session, router, loadAccounts, loadBudgetData]);

  const today = getNowHonduras();
  const todayStr = getHondurasDateString(today);
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const monthKey = getMonthKey(today);
  const actualExpenses = getActualExpensesInMonth(transactions, monthKey);

  const hasPaydaysConfigured = incomeSchedules.some((s) => s.is_active);
  const endDateStr =
    periodOption === "cobro"
      ? hasPaydaysConfigured
        ? getNextPayday(incomeSchedules, today)
        : getNext15(today)
      : periodOption === "15"
        ? getNext15(today)
        : periodOption === "30"
          ? getNext30(today)
          : customDate && customDate >= todayStr
            ? customDate
            : customDate || getNext15(today);

  const daysUntilPayday = getDaysUntilNextPayday(today, endDateStr);
  const weeksUntilPayday = getWeeksUntilNextPayday(today, endDateStr);
  const dailyDisposable = getDailyDisposableUntilNextPayday(totalBalance, daysUntilPayday);
  const weeklyDisposable = getWeeklyDisposableUntilNextPayday(totalBalance, weeksUntilPayday);

  const fixedMonthlyBudgets = budgets.filter((b) => b.period === "monthly");
  const fixedWithPaid = fixedMonthlyBudgets.map((b) => ({
    ...b,
    paid: paidThisMonth.some((p) => p.budget_id === b.id),
  }));

  function handleLogout() {
    logout();
    router.replace("/login");
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
              {formatDateHonduras(today)}
            </p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-foreground" aria-label="Hora Honduras">
              {time24}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="size-8">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Ajustes</span>
              </Button>
            </Link>
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

        <section className="mb-8">
          <div className="grid grid-cols-2 gap-3">
            <BudgetCard label="Dinero actual" amount={totalBalance} variant="large" />
            <BudgetCard
              label="Gastos este mes"
              amount={actualExpenses}
              sublabel="Este mes"
              trend={actualExpenses > 0 ? "down" : "neutral"}
            />
          </div>

          <div className="mt-4 border border-border p-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Disponible hasta
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                variant={periodOption === "cobro" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodOption("cobro")}
              >
                Próximo cobro
              </Button>
              <Button
                variant={periodOption === "15" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodOption("15")}
              >
                Próximo 15
              </Button>
              <Button
                variant={periodOption === "30" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodOption("30")}
              >
                Próximo 30
              </Button>
              <Button
                variant={periodOption === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodOption("custom")}
              >
                Fecha personalizada
              </Button>
            </div>
            {periodOption === "cobro" && !hasPaydaysConfigured && (
              <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
                Configurá ingresos en Ajustes → Ingresos para usar &quot;Próximo cobro&quot;. Por ahora se usa próximo 15.
              </p>
            )}
            {periodOption === "custom" && (
              <div className="mb-3">
                <label className="mb-1 block text-xs text-muted-foreground">Hasta el día</label>
                <input
                  type="date"
                  value={customDate || getNext15(today)}
                  min={todayStr}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            )}
            <p className="mb-3 text-xs text-muted-foreground">
              Fecha de referencia: {endDateStr}
            </p>
            <div className="mb-3 flex gap-2">
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
              >
                Por día
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
              >
                Por semana
              </Button>
            </div>
            {viewMode === "day" ? (
              <BudgetCard
                label="Disponible por día"
                amount={dailyDisposable}
                sublabel={`${daysUntilPayday} día(s) restante(s)`}
              />
            ) : (
              <BudgetCard
                label="Disponible por semana"
                amount={weeklyDisposable}
                sublabel={`${weeksUntilPayday} semana(s) restante(s)`}
              />
            )}
          </div>
        </section>

        <section className="mb-8">
          <h3 className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            Gastos fijos este mes (guía)
          </h3>
          <div className="border border-border bg-background">
            {fixedWithPaid.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Sin gastos fijos. Agregá en Presupuesto.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {fixedWithPaid.map((b) => (
                  <li
                    key={b.id}
                    className={`flex items-center justify-between px-4 py-3 text-sm ${b.paid ? "text-muted-foreground" : ""}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {b.paid ? (
                        <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
                      ) : (
                        <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
                      )}
                      <span className={b.paid ? "line-through" : ""}>{b.name}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(Number(b.amount))}
                      {b.paid && " (pagado)"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h3 className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            Cuentas
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <AccountCard
                  account={account}
                  onClick={() => handleOpenQuickAdd(account.type === "credit_card" ? "cc_charge" : "expense")}
                />
              </motion.div>
            ))}
          </div>
          {accounts.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sin cuentas. <Link href="/settings" className="underline hover:no-underline">Ajustes</Link>.
            </p>
          )}
        </section>

        <section className="mb-24">
          <h3 className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            Acceso rápido
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/ledger">
              <Button variant="outline" className="h-auto w-full flex-col gap-2 bg-transparent py-6">
                <BookOpen className="h-5 w-5" />
                <span className="text-xs">Libro diario</span>
              </Button>
            </Link>
            <Link href="/budget">
              <Button variant="outline" className="h-auto w-full flex-col gap-2 bg-transparent py-6">
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
        onSuccess={() => {
          loadAccounts();
          loadBudgetData();
        }}
        playSound={playShutterSound}
      />
    </div>
  );
}
