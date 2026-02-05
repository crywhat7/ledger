"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, LogOut, Settings, BookOpen, Calendar, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/session";
import { IncomeRequiredAlert } from "@/components/IncomeRequiredAlert";
import { BudgetCard } from "@/components/BudgetCard";
import { AccountCard } from "@/components/AccountCard";
import { QuickAddModal } from "@/components/QuickAddModal";
import type { Account } from "@/types/database";
import { supabase } from "@/lib/supabase/client";
import { playShutterSound } from "@/lib/sound";
import {
  getExpectedIncomeMonthly,
  getActualIncomeInMonth,
  getActualExpensesInMonth,
  getWeeklyDisposable,
  getDailyDisposableFromDaysLeft,
  getDaysLeftInQuincena,
  getMonthKey,
  getQuincenaBounds,
  getQuincenaDateRange,
  getIncomeInQuincena,
  getExpensesInQuincena,
  getFixedDueInQuincenaUnpaid,
  getFixedDueInQuincenaBreakdown,
  getWeeksLeftInQuincena,
  getAvailableFromQuincenaIncome,
} from "@/lib/budget";
import type { IncomeSchedule } from "@/types/database";
import type { Budget } from "@/types/database";
import type { Transaction } from "@/types/database";

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
  const [showIncomeAlertDismissed, setShowIncomeAlertDismissed] = useState(false);
  const [verMasOpen, setVerMasOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState<"income" | "expense" | "transfer" | "cc_charge" | "cc_payment">("expense");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeSchedules, setIncomeSchedules] = useState<IncomeSchedule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetDueDates, setBudgetDueDates] = useState<{ budget_id: string; day_of_month: number; percentage: number }[]>([]);
  const [paidThisMonth, setPaidThisMonth] = useState<{ budget_id: string }[]>([]);
  const [incomeLogThisMonth, setIncomeLogThisMonth] = useState<{ expected_date: string }[]>([]);

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
    const now = new Date();
    const month = getMonthKey(now);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
    const [schedRes, txRes, budgRes, paidRes, logRes] = await Promise.all([
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
      supabase
        .from("income_registration_log")
        .select("expected_date")
        .eq("user_id", session.userId)
        .gte("expected_date", `${month}-01`)
        .lte("expected_date", endDate),
    ]);
    setIncomeSchedules(schedRes.data ?? []);
    setTransactions(txRes.data as Transaction[] ?? []);
    const budgList = budgRes.data ?? [];
    setBudgets(budgList);
    setPaidThisMonth(paidRes.data ?? []);
    setIncomeLogThisMonth(logRes.data ?? []);
    const budgetIds = budgList.map((b: { id: string }) => b.id);
    if (budgetIds.length > 0) {
      const dueRes = await supabase.from("budget_due_dates").select("budget_id, day_of_month, percentage").in("budget_id", budgetIds);
      setBudgetDueDates(dueRes.data ?? []);
    } else {
      setBudgetDueDates([]);
    }
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
    loadBudgetData();
  }, [session, router, loadAccounts, loadBudgetData]);

  const today = new Date();
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const monthKey = getMonthKey(today);
  const expectedIncome = getExpectedIncomeMonthly(incomeSchedules);
  const actualIncome = getActualIncomeInMonth(transactions, monthKey);
  const actualExpenses = getActualExpensesInMonth(transactions, monthKey);
  const { startDay, endDay } = getQuincenaBounds(today);
  const { start: quincenaStart, end: quincenaEnd } = getQuincenaDateRange(today);
  const paidBudgetIds = new Set(paidThisMonth.map((p) => p.budget_id));
  const incomeInQuincena = getIncomeInQuincena(transactions, quincenaStart, quincenaEnd);
  const expensesInQuincena = getExpensesInQuincena(transactions, quincenaStart, quincenaEnd);
  const fixedDueThisQuincena = getFixedDueInQuincenaUnpaid(budgets, budgetDueDates, startDay, endDay, paidBudgetIds);
  const fixedDueBreakdown = getFixedDueInQuincenaBreakdown(budgets, budgetDueDates, startDay, endDay, paidBudgetIds);
  const available = getAvailableFromQuincenaIncome(incomeInQuincena, fixedDueThisQuincena, expensesInQuincena);
  const daysLeftQuincena = getDaysLeftInQuincena(today, endDay);
  const weeksLeftQuincena = getWeeksLeftInQuincena(today, endDay);
  const weeklyDisposable = getWeeklyDisposable(available, weeksLeftQuincena);
  const dailyDisposable = getDailyDisposableFromDaysLeft(available, daysLeftQuincena);

  const fixedMonthlyBudgets = budgets.filter((b) => b.period === "monthly");
  const unpaidFixedBudgets = fixedMonthlyBudgets.filter(
    (b) => !paidThisMonth.some((p) => p.budget_id === b.id)
  );

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const registeredDates = new Set(incomeLogThisMonth.map((e) => e.expected_date));
  const hasUnregisteredPayday = incomeSchedules.some((s) => {
    if (!s.is_active) return false;
    const expectedDate = `${monthKey}-${String(s.day_of_month).padStart(2, "0")}`;
    return expectedDate <= todayStr && !registeredDates.has(expectedDate);
  });
  const showIncomeAlert = hasUnregisteredPayday;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function handleAddIncome() {
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

        {showIncomeAlert && !showIncomeAlertDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <IncomeRequiredAlert
              onAddIncome={handleAddIncome}
              onDismiss={() => setShowIncomeAlertDismissed(true)}
            />
          </motion.div>
        )}

        <section className="mb-8">
          {incomeInQuincena === 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              Registrá el ingreso de esta quincena para ver tu disponible.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <BudgetCard label="Saldo total" amount={totalBalance} variant="large" />
            <BudgetCard
              label="Disponible esta quincena"
              amount={available}
              sublabel="Libre para gastar"
              variant="large"
            />
            <BudgetCard
              label="Disponible diario"
              amount={dailyDisposable}
              sublabel={`${daysLeftQuincena} día(s) restante(s)`}
            />
            <BudgetCard
              label="Disponible semanal"
              amount={weeklyDisposable}
              sublabel={`${weeksLeftQuincena} semana(s) restante(s)`}
            />
          </div>

          <div className="mt-6 border border-border">
            <button
              type="button"
              onClick={() => setVerMasOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50"
              aria-expanded={verMasOpen}
            >
              <span>Ver más</span>
              {verMasOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {verMasOpen && (
              <div className="border-t border-border px-4 py-4">
                {fixedDueBreakdown.length > 0 && (
                  <div className="mb-6">
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Gastos fijos esta quincena (días {startDay}–{endDay})
                    </p>
                    <ul className="space-y-1 text-sm">
                      {fixedDueBreakdown.map((item, i) => (
                        <li
                          key={i}
                          className={`flex items-center justify-between gap-2 ${item.paid ? "text-muted-foreground" : ""}`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {item.paid ? (
                              <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
                            ) : (
                              <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
                            )}
                            <span className={item.paid ? "line-through" : ""}>{item.name}</span>
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(item.amount)}
                            {item.paid && " (pagado)"}
                          </span>
                        </li>
                      ))}
                      <li className="flex justify-between border-t border-border pt-2 mt-2 font-medium">
                        <span>Total restado (solo no pagados)</span>
                        <span className="tabular-nums">
                          {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(fixedDueThisQuincena)}
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
                <div className="mb-6 grid grid-cols-2 gap-3">
                  <BudgetCard
                    label="Ingresos"
                    amount={actualIncome}
                    sublabel={`de ${new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(expectedIncome)} esperados`}
                    trend={actualIncome >= expectedIncome ? "up" : "neutral"}
                  />
                  <BudgetCard
                    label="Gastos"
                    amount={actualExpenses}
                    sublabel="Este mes"
                    trend={actualExpenses > 0 ? "down" : "neutral"}
                  />
                </div>
                {unpaidFixedBudgets.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Gastos fijos no pagados este mes
                    </h3>
                    <ul className="divide-y divide-border border border-border">
                      {unpaidFixedBudgets.map((b) => (
                        <li key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="text-foreground">{b.name}</span>
                          <span className="font-medium text-foreground">
                            {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(Number(b.amount))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Al registrar el pago, marcá &quot;¿Es para un gasto fijo?&quot; y elegí uno.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <section className="mt-8">
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

          <section className="mt-8 mb-24">
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
