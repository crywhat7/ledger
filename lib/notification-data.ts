import type { SupabaseClient } from "@supabase/supabase-js";
import type { Budget } from "@/types/database";
import {
  getQuincenaBounds,
  getQuincenaDateRange,
  getIncomeInQuincena,
  getExpensesInQuincena,
  getFixedDueInQuincenaUnpaid,
  getAvailableFromQuincenaIncome,
  getDaysLeftInQuincena,
  getWeeksLeftInQuincena,
  getDailyDisposableFromDaysLeft,
  getWeeklyDisposable,
  getMonthKey,
} from "@/lib/budget";

type TransactionRow = { type: string; amount: number; transaction_date: string };
type DueDateRow = { budget_id: string; day_of_month: number; percentage: number };

export async function getDisposableForUser(
  supabase: SupabaseClient,
  userId: string,
  date: Date = new Date()
): Promise<{ dailyDisposable: number; weeklyDisposable: number }> {
  const monthKey = getMonthKey(date);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const endDate = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

  const [txRes, budgetsRes, dueRes, paidRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, transaction_date")
      .eq("user_id", userId)
      .gte("transaction_date", `${monthKey}-01`)
      .lte("transaction_date", endDate),
    supabase.from("budgets").select("*").eq("user_id", userId),
    supabase.from("budget_due_dates").select("budget_id, day_of_month, percentage"),
    supabase
      .from("budget_month_paid")
      .select("budget_id")
      .eq("user_id", userId)
      .eq("month", monthKey),
  ]);

  const transactions = (txRes.data ?? []) as TransactionRow[];
  const budgets = (budgetsRes.data ?? []) as Budget[];
  const dueDates = (dueRes.data ?? []) as DueDateRow[];
  const paidThisMonth = paidRes.data ?? [];
  const paidBudgetIds = new Set(paidThisMonth.map((p: { budget_id: string }) => p.budget_id));

  const { startDay, endDay } = getQuincenaBounds(date);
  const { start: quincenaStart, end: quincenaEnd } = getQuincenaDateRange(date);
  const incomeInQuincena = getIncomeInQuincena(transactions, quincenaStart, quincenaEnd);
  const expensesInQuincena = getExpensesInQuincena(transactions, quincenaStart, quincenaEnd);
  const fixedDueThisQuincena = getFixedDueInQuincenaUnpaid(
    budgets,
    dueDates,
    startDay,
    endDay,
    paidBudgetIds
  );
  const available = getAvailableFromQuincenaIncome(
    incomeInQuincena,
    fixedDueThisQuincena,
    expensesInQuincena
  );
  const daysLeft = getDaysLeftInQuincena(date, endDay);
  const weeksLeft = getWeeksLeftInQuincena(date, endDay);
  const dailyDisposable = getDailyDisposableFromDaysLeft(available, daysLeft);
  const weeklyDisposable = getWeeklyDisposable(available, weeksLeft);

  return { dailyDisposable, weeklyDisposable };
}
