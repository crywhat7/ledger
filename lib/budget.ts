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

/** Gastos y cargos a tarjeta registrados en una quincena (expense + cc_charge entre start y end). */
export function getExpensesInQuincena(
  transactions: TransactionRow[],
  startDate: string,
  endDate: string
): number {
  return transactions
    .filter(
      (t) =>
        (t.type === "expense" || t.type === "cc_charge") &&
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
 * Lista de gastos fijos que entran en esta quincena con su monto y si ya los pagaste.
 * Para mostrar en el dashboard con ✓ en los pagados.
 */
export function getFixedDueInQuincenaBreakdown(
  budgets: Budget[],
  dueDates: DueDateRow[],
  startDay: number,
  endDay: number,
  paidBudgetIdsThisMonth: Set<string>
): { name: string; amount: number; paid: boolean }[] {
  const fixedBudgets = budgets.filter((b) => b.period === "monthly");
  const result: { name: string; amount: number; paid: boolean }[] = [];
  for (const b of fixedBudgets) {
    const budgetDueDates = dueDates.filter(
      (d) => d.budget_id === b.id && d.day_of_month >= startDay && d.day_of_month <= endDay
    );
    if (budgetDueDates.length === 0) continue;
    const pct = budgetDueDates.reduce((s, d) => s + Number(d.percentage), 0);
    const amount = (Number(b.amount) * pct) / 100;
    result.push({ name: b.name, amount, paid: paidBudgetIdsThisMonth.has(b.id) });
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

/** Días restantes en la quincena (incluye hoy). Mínimo 1. */
export function getDaysLeftInQuincena(date: Date, endDay: number): number {
  const today = date.getDate();
  return Math.max(1, endDay - today + 1);
}

/** Semanas restantes en la quincena (según días que faltan). Mínimo 1. */
export function getWeeksLeftInQuincena(date: Date, endDay: number): number {
  const daysLeft = getDaysLeftInQuincena(date, endDay);
  return Math.max(1, Math.ceil(daysLeft / 7));
}

/**
 * Disponible para gastar en la quincena = ingreso de esta quincena − gastos fijos de esta quincena
 * − gastos/cargos ya registrados en esta quincena (lo que ya gastaste).
 */
export function getAvailableFromQuincenaIncome(
  incomeInQuincena: number,
  fixedDueThisQuincenaTotal: number,
  expensesInQuincena: number = 0
): number {
  return incomeInQuincena - fixedDueThisQuincenaTotal - expensesInQuincena;
}

/** Disponible por semana = disponible ÷ semanas que faltan en la quincena. */
export function getWeeklyDisposable(available: number, weeksLeft: number): number {
  return weeksLeft > 0 ? available / weeksLeft : 0;
}

/** Disponible por día = disponible ÷ días que faltan en la quincena (si no gastás hoy, tenés más mañana). */
export function getDailyDisposableFromDaysLeft(available: number, daysLeft: number): number {
  return daysLeft > 0 ? available / daysLeft : 0;
}

/** Daily disposable = weekly / 7 (legacy, para página Presupuesto) */
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

/** Días del mes (1-31) en que hay cobro configurado (activos). */
function getPaydaysFromSchedules(schedules: IncomeSchedule[]): number[] {
  const days = [
    ...new Set(
      schedules.filter((s) => s.is_active).map((s) => s.day_of_month)
    ),
  ].filter((d) => d >= 1 && d <= 31);
  return days.sort((a, b) => a - b);
}

/**
 * Fecha (YYYY-MM-DD) del próximo cobro a partir de `fromDate`.
 * Usa los day_of_month de income_schedules activos.
 */
export function getNextPayday(
  schedules: IncomeSchedule[],
  fromDate: Date
): string {
  const paydays = getPaydaysFromSchedules(schedules);
  if (paydays.length === 0) {
    const y = fromDate.getFullYear();
    const m = fromDate.getMonth();
    const nextMonth = new Date(y, m + 1, 1);
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
  }
  const day = fromDate.getDate();
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const nextDayThisMonth = paydays.find((d) => d >= day && d <= lastDay);
  if (nextDayThisMonth !== undefined) {
    const m = String(month + 1).padStart(2, "0");
    return `${year}-${m}-${String(nextDayThisMonth).padStart(2, "0")}`;
  }
  const firstPaydayNextMonth = paydays[0];
  const nextMonth = new Date(year, month + 1, 1);
  const nextLastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const dayClamped = Math.min(firstPaydayNextMonth, nextLastDay);
  const ny = nextMonth.getFullYear();
  const nm = String(nextMonth.getMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}-${String(dayClamped).padStart(2, "0")}`;
}

/**
 * Próxima fecha para un día del mes (15 o 30). Para febrero, 30 → último día del mes.
 */
export function getNextDayOfMonth(fromDate: Date, dayOfMonth: number): string {
  const y = fromDate.getFullYear();
  const m = fromDate.getMonth();
  const day = fromDate.getDate();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const targetDay = Math.min(dayOfMonth, lastDay);
  if (day <= targetDay) {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(targetDay).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  const nextMonth = new Date(y, m + 1, 1);
  const nextLast = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const nextTarget = Math.min(dayOfMonth, nextLast);
  const ny = nextMonth.getFullYear();
  const nm = String(nextMonth.getMonth() + 1).padStart(2, "0");
  const nd = String(nextTarget).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

/** Próximo día 15. */
export function getNext15(fromDate: Date): string {
  return getNextDayOfMonth(fromDate, 15);
}

/** Próximo día 30 (en febrero = 28 o 29). */
export function getNext30(fromDate: Date): string {
  return getNextDayOfMonth(fromDate, 30);
}

/** Días restantes desde `fromDate` hasta `nextPaydayStr` (incluye el día de cobro). Mínimo 1. */
export function getDaysUntilNextPayday(fromDate: Date, nextPaydayStr: string): number {
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const [y, m, d] = nextPaydayStr.split("-").map(Number);
  const to = new Date(y, m - 1, d);
  const diff = Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
  return Math.max(1, diff + 1);
}

/** Semanas restantes hasta el próximo cobro (redondeo hacia arriba). Mínimo 1. */
export function getWeeksUntilNextPayday(fromDate: Date, nextPaydayStr: string): number {
  const days = getDaysUntilNextPayday(fromDate, nextPaydayStr);
  return Math.max(1, Math.ceil(days / 7));
}

/**
 * Disponible por día hasta el próximo cobro = saldo / días restantes.
 * Disponible por semana = saldo / semanas restantes.
 * No se restan gastos fijos; el saldo es la base.
 */
export function getDailyDisposableUntilNextPayday(
  balance: number,
  daysLeft: number
): number {
  return daysLeft > 0 ? balance / daysLeft : 0;
}

export function getWeeklyDisposableUntilNextPayday(
  balance: number,
  weeksLeft: number
): number {
  return weeksLeft > 0 ? balance / weeksLeft : 0;
}
