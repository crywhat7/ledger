import type { SupabaseClient } from "@supabase/supabase-js";
import type { IncomeSchedule } from "@/types/database";
import {
  getNextPayday,
  getDaysUntilNextPayday,
  getWeeksUntilNextPayday,
  getDailyDisposableUntilNextPayday,
  getWeeklyDisposableUntilNextPayday,
} from "@/lib/budget";

/**
 * Obtiene disponible por día y por semana hasta el próximo cobro.
 * Base = saldo actual (suma de cuentas). No se restan gastos fijos.
 */
export async function getDisposableForUser(
  supabase: SupabaseClient,
  userId: string,
  date: Date = new Date()
): Promise<{ dailyDisposable: number; weeklyDisposable: number }> {
  const [accountsRes, schedRes] = await Promise.all([
    supabase.from("accounts").select("balance").eq("user_id", userId),
    supabase.from("income_schedules").select("*").eq("user_id", userId),
  ]);

  const accounts = accountsRes.data ?? [];
  const balance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const schedules = (schedRes.data ?? []) as IncomeSchedule[];

  const nextPaydayStr = getNextPayday(schedules, date);
  const daysLeft = getDaysUntilNextPayday(date, nextPaydayStr);
  const weeksLeft = getWeeksUntilNextPayday(date, nextPaydayStr);

  const dailyDisposable = getDailyDisposableUntilNextPayday(balance, daysLeft);
  const weeklyDisposable = getWeeklyDisposableUntilNextPayday(balance, weeksLeft);

  return { dailyDisposable, weeklyDisposable };
}
