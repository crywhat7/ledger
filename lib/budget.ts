import type { IncomeSchedule } from "@/types/database";
import type { Budget } from "@/types/database";

type TransactionRow = {
  type: string;
  amount: number;
  transaction_date: string;
};

type DueDateRow = { budget_id: string; day_of_month: number; percentage: number };

/** Expected income per month = sum of all active income schedules */
export function getExpectedIncomeMonthly(schedules: IncomeSchedule[]): number {
  return schedules
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.amount), 0);
}

/** Actual income in a given month (YYYY-MM) */
export function getActualIncomeInMonth(transactions: TransactionRow[], month: string): number {
  return transactions
    .filter((t) => t.type === "income" && t.transaction_date.startsWith(month))
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

/** Total expenses in a given month (expense + cc_charge; outflows) */
export function getActualExpensesInMonth(transactions: TransactionRow[], month: string): number {
  return transactions
    .filter(
      (t) =>
        (t.type === "expense" || t.type === "cc_charge") &&
        t.transaction_date.startsWith(month)
    )
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

/** Fixed monthly total = sum of budgets with period monthly */
export function getFixedMonthlyTotal(budgets: Budget[]): number {
  return budgets
    .filter((b) => b.period === "monthly")
    .reduce((sum, b) => sum + Number(b.amount), 0);
}

/** Quincena: 1-15 o 16-último día del mes. Devuelve { startDay, endDay }. */
export function getQuincenaBounds(date: Date): { startDay: number; endDay: number } {
  const day = date.getDate();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (day <= 15) return { startDay: 1, endDay: 15 };
  return { startDay: 16, endDay: lastDay };
}

/** Rango de fechas (YYYY-MM-DD) de la quincena actual para el mes de date. */
export function getQuincenaDateRange(date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const { startDay, endDay } = getQuincenaBounds(date);
  return {
    start: `${y}-${m}-${String(startDay).padStart(2, "0")}`,
    end: `${y}-${m}-${String(endDay).padStart(2, "0")}`,
  };
}

/** Ingreso registrado en una quincena (transacciones tipo income entre start y end, inclusivo). */
export function getIncomeInQuincena(
  transactions: TransactionRow[],
  startDate: string,
  endDate: string
): number {
  return transactions
    .filter(
      (t) =>
        t.type === "income" &&
        t.transaction_date >= startDate &&
        t.transaction_date <= endDate
    )
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

/**
 * Monto total que debés pagar en esta quincena por gastos fijos (todos los que tienen
 * al menos una fecha de pago en [startDay, endDay]). Como en Excel: sueldo − esto = disponible.
 */
export function getFixedDueInQuincenaTotal(
  budgets: Budget[],
  dueDates: DueDateRow[],
  startDay: number,
  endDay: number
): number {
  const fixedBudgets = budgets.filter((b) => b.period === "monthly");
  let total = 0;
  for (const b of fixedBudgets) {
    const budgetDueDates = dueDates.filter(
      (d) => d.budget_id === b.id && d.day_of_month >= startDay && d.day_of_month <= endDay
    );
    if (budgetDueDates.length === 0) continue;
    const pct = budgetDueDates.reduce((s, d) => s + Number(d.percentage), 0);
    total += (Number(b.amount) * pct) / 100;
  }
  return total;
}

/**
 * Lista de gastos fijos que entran en esta quincena con su monto (nombre + monto).
 * Para mostrar en el dashboard "qué gastos fijos está metiendo" en el cálculo.
 */
export function getFixedDueInQuincenaBreakdown(
  budgets: Budget[],
  dueDates: DueDateRow[],
  startDay: number,
  endDay: number
): { name: string; amount: number }[] {
  const fixedBudgets = budgets.filter((b) => b.period === "monthly");
  const result: { name: string; amount: number }[] = [];
  for (const b of fixedBudgets) {
    const budgetDueDates = dueDates.filter(
      (d) => d.budget_id === b.id && d.day_of_month >= startDay && d.day_of_month <= endDay
    );
    if (budgetDueDates.length === 0) continue;
    const pct = budgetDueDates.reduce((s, d) => s + Number(d.percentage), 0);
    const amount = (Number(b.amount) * pct) / 100;
    result.push({ name: b.name, amount });
  }
  return result;
}

/**
 * Monto total que debés pagar en esta quincena por gastos fijos (solo los que aún no marcaste como pagados este mes).
 * Usado para listas "gastos fijos no pagados".
 */
export function getFixedDueInQuincenaUnpaid(
  budgets: Budget[],
  dueDates: DueDateRow[],
  startDay: number,
  endDay: number,
  paidBudgetIdsThisMonth: Set<string>
): number {
  const fixedBudgets = budgets.filter((b) => b.period === "monthly");
  let total = 0;
  for (const b of fixedBudgets) {
    if (paidBudgetIdsThisMonth.has(b.id)) continue;
    const budgetDueDates = dueDates.filter(
      (d) => d.budget_id === b.id && d.day_of_month >= startDay && d.day_of_month <= endDay
    );
    if (budgetDueDates.length === 0) continue;
    const pct = budgetDueDates.reduce((s, d) => s + Number(d.percentage), 0);
    total += (Number(b.amount) * pct) / 100;
  }
  return total;
}

/** Semanas restantes en la quincena actual (desde hoy hasta endDay). Mínimo 1. */
export function getWeeksLeftInQuincena(date: Date, endDay: number): number {
  const today = date.getDate();
  const daysLeft = endDay - today + 1;
  return Math.max(1, Math.ceil(daysLeft / 7));
}

/** Disponible para gastar en la quincena = ingreso de esta quincena − gastos fijos de esta quincena (como Excel). */
export function getAvailableFromQuincenaIncome(
  incomeInQuincena: number,
  fixedDueThisQuincenaTotal: number
): number {
  return incomeInQuincena - fixedDueThisQuincenaTotal;
}

/** Weekly disposable = available / weeks left (at least 1 week) */
export function getWeeklyDisposable(available: number, weeksLeft: number): number {
  return weeksLeft > 0 ? available / weeksLeft : 0;
}

/** Daily disposable = weekly disposable / 7 */
export function getDailyDisposable(weeklyDisposable: number): number {
  return weeklyDisposable / 7;
}

/** Weeks left in month from a given date (inclusive of today) — legacy / presupuesto page */
export function getWeeksLeftInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const today = date.getDate();
  const daysLeft = lastDay - today + 1;
  return Math.max(1, Math.ceil(daysLeft / 7));
}

/** Days left in month (inclusive of today) */
export function getDaysLeftInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const today = date.getDate();
  return Math.max(1, lastDay - today + 1);
}

/**
 * Remaining to spend this month = actual income - fixed monthly - actual expenses.
 * Can be negative if overspent. (Usado en página Presupuesto.)
 */
export function getRemainingThisMonth(
  actualIncome: number,
  fixedMonthly: number,
  actualExpenses: number
): number {
  return actualIncome - fixedMonthly - actualExpenses;
}

export function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
