import type { IncomeSchedule } from "@/types/database";
import type { Budget } from "@/types/database";

type TransactionRow = {
  type: string;
  amount: number;
  transaction_date: string;
};

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

/** Weeks left in month from a given date (inclusive of today) */
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
 * Can be negative if overspent.
 */
export function getRemainingThisMonth(
  actualIncome: number,
  fixedMonthly: number,
  actualExpenses: number
): number {
  return actualIncome - fixedMonthly - actualExpenses;
}

/** Weekly disposable = remaining / weeks left (at least 1 week) */
export function getWeeklyDisposable(remaining: number, weeksLeft: number): number {
  return weeksLeft > 0 ? remaining / weeksLeft : 0;
}

/** Daily disposable = weekly disposable / 7 */
export function getDailyDisposable(weeklyDisposable: number): number {
  return weeklyDisposable / 7;
}

export function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
