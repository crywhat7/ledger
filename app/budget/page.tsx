"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Pencil, Trash2, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/store/session";
import { supabase } from "@/lib/supabase/client";
import { BudgetCard } from "@/components/BudgetCard";
import {
  getExpectedIncomeMonthly,
  getActualIncomeInMonth,
  getActualExpensesInMonth,
  getFixedMonthlyTotal,
  getRemainingThisMonth,
  getWeeklyDisposable,
  getDailyDisposable,
  getWeeksLeftInMonth,
  getMonthKey,
} from "@/lib/budget";
import type { IncomeSchedule } from "@/types/database";
import type { Budget } from "@/types/database";
import type { Transaction } from "@/types/database";
import type { BudgetMonthPaid } from "@/types/database";

export default function BudgetPage() {
  const router = useRouter();
  const { session, hydrate } = useSessionStore();
  const [incomeSchedules, setIncomeSchedules] = useState<IncomeSchedule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [paidThisMonth, setPaidThisMonth] = useState<BudgetMonthPaid[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    amount: string;
    dueDates: { day_of_month: number; percentage: number }[];
  }>({ name: "", amount: "", dueDates: [{ day_of_month: 1, percentage: 100 }] });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [budgetDueDates, setBudgetDueDates] = useState<{ budget_id: string; day_of_month: number; percentage: number }[]>([]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    load();
  }, [session, router]);

  async function load() {
    if (!session) return;
    const now = new Date();
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
      supabase.from("budget_month_paid").select("*").eq("user_id", session.userId).eq("month", month),
    ]);
    setIncomeSchedules(schedRes.data ?? []);
    setTransactions(txRes.data as Transaction[] ?? []);
    const budgList = budgRes.data ?? [];
    setBudgets(budgList);
    setPaidThisMonth(paidRes.data ?? []);
    const budgetIds = budgList.map((b: { id: string }) => b.id);
    if (budgetIds.length > 0) {
      const dueRes = await supabase.from("budget_due_dates").select("budget_id, day_of_month, percentage").in("budget_id", budgetIds);
      setBudgetDueDates(dueRes.data ?? []);
    } else {
      setBudgetDueDates([]);
    }
    setLoading(false);
  }

  const today = new Date();
  const monthKey = getMonthKey(today);
  const expectedIncome = getExpectedIncomeMonthly(incomeSchedules);
  const actualIncome = getActualIncomeInMonth(transactions, monthKey);
  const actualExpenses = getActualExpensesInMonth(transactions, monthKey);
  const fixedMonthly = getFixedMonthlyTotal(budgets);
  const remaining = getRemainingThisMonth(actualIncome, fixedMonthly, actualExpenses);
  const weeksLeft = getWeeksLeftInMonth(today);
  const weeklyDisposable = getWeeklyDisposable(remaining, weeksLeft);
  const dailyDisposable = getDailyDisposable(weeklyDisposable);

  async function handleSaveBudget(e: React.FormEvent, budgetId?: string) {
    e.preventDefault();
    setFormError("");
    const name = form.name.trim();
    const amount = parseFloat(form.amount.replace(",", "."));
    const dueDates = form.dueDates.filter((d) => d.day_of_month >= 1 && d.day_of_month <= 31 && d.percentage > 0);
    const totalPct = dueDates.reduce((s, d) => s + d.percentage, 0);
    if (!name || isNaN(amount) || amount < 0) {
      setFormError("Nombre y monto válido requeridos");
      return;
    }
    if (dueDates.length === 0) {
      setFormError("Agregá al menos una fecha de pago");
      return;
    }
    if (Math.abs(totalPct - 100) > 0.01) {
      setFormError(`Los porcentajes deben sumar 100% (ahora suman ${totalPct.toFixed(0)}%)`);
      return;
    }
    if (!session) return;
    setFormLoading(true);
    try {
      let id = budgetId;
      if (budgetId) {
        await supabase
          .from("budgets")
          .update({ name, amount, period: "monthly", is_fixed: true })
          .eq("id", budgetId)
          .eq("user_id", session.userId);
      } else {
        const { data: inserted } = await supabase
          .from("budgets")
          .insert({
            user_id: session.userId,
            name,
            amount,
            period: "monthly",
            is_fixed: true,
          })
          .select("id")
          .single();
        id = inserted?.id ?? null;
      }
      if (id) {
        await supabase.from("budget_due_dates").delete().eq("budget_id", id);
        for (const d of dueDates) {
          await supabase.from("budget_due_dates").insert({
            budget_id: id,
            day_of_month: d.day_of_month,
            percentage: d.percentage,
          });
        }
      }
      await load();
      setEditingId(null);
      setAdding(false);
      setForm({ name: "", amount: "", dueDates: [{ day_of_month: 1, percentage: 100 }] });
    } catch {
      setFormError("No se pudo guardar");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(b: Budget) {
    if (!confirm(`¿Eliminar el gasto fijo "${b.name}"?`)) return;
    if (!session) return;
    setFormLoading(true);
    try {
      await supabase.from("budgets").delete().eq("id", b.id).eq("user_id", session.userId);
      await load();
      setEditingId(null);
    } catch {
      setFormError("No se pudo eliminar");
    } finally {
      setFormLoading(false);
    }
  }

  function openEdit(b: Budget) {
    setEditingId(b.id);
    setAdding(false);
    const due = budgetDueDates.filter((d) => d.budget_id === b.id);
    setForm({
      name: b.name,
      amount: String(b.amount),
      dueDates: due.length > 0 ? due.map((d) => ({ day_of_month: d.day_of_month, percentage: Number(d.percentage) })) : [{ day_of_month: 1, percentage: 100 }],
    });
    setFormError("");
  }

  function openAdd() {
    setAdding(true);
    setEditingId(null);
    setForm({ name: "", amount: "", dueDates: [{ day_of_month: 1, percentage: 100 }] });
    setFormError("");
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setFormError("");
  }

  function addDueDate() {
    setForm((f) => ({ ...f, dueDates: [...f.dueDates, { day_of_month: 15, percentage: 0 }] }));
  }

  function removeDueDate(index: number) {
    setForm((f) => ({
      ...f,
      dueDates: f.dueDates.filter((_, i) => i !== index),
    }));
  }

  function updateDueDate(index: number, field: "day_of_month" | "percentage", value: number) {
    setForm((f) => ({
      ...f,
      dueDates: f.dueDates.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    }));
  }

  function isPaidThisMonth(budgetId: string): boolean {
    return paidThisMonth.some((p) => p.budget_id === budgetId);
  }

  async function togglePaid(b: Budget) {
    if (!session) return;
    const month = getMonthKey(new Date());
    const paid = isPaidThisMonth(b.id);
    setFormLoading(true);
    try {
      if (paid) {
        await supabase
          .from("budget_month_paid")
          .delete()
          .eq("user_id", session.userId)
          .eq("budget_id", b.id)
          .eq("month", month);
      } else {
        await supabase.from("budget_month_paid").insert({
          user_id: session.userId,
          budget_id: b.id,
          month,
        });
      }
      await load();
    } catch {
      setFormError("No se pudo actualizar");
    } finally {
      setFormLoading(false);
    }
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
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="size-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
          </Link>
          <h1 className="font-serif text-xl font-light tracking-tight text-foreground">
            Presupuesto
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
        ) : (
          <>
            <section className="mb-8">
              <h2 className="mb-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Este mes
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <BudgetCard
                  label="Ingresos esperados"
                  amount={expectedIncome}
                  sublabel="Según tus ingresos configurados"
                />
                <BudgetCard
                  label="Ingresos registrados"
                  amount={actualIncome}
                  sublabel={`de ${new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(expectedIncome)}`}
                  trend={actualIncome >= expectedIncome ? "up" : "neutral"}
                />
                <BudgetCard
                  label="Gastos fijos"
                  amount={fixedMonthly}
                  sublabel="Alquiler, servicios, etc."
                />
                <BudgetCard
                  label="Gastos realizados"
                  amount={actualExpenses}
                  sublabel="Este mes"
                  trend={actualExpenses > 0 ? "down" : "neutral"}
                />
                <BudgetCard
                  label="Resto disponible"
                  amount={remaining}
                  sublabel={`${weeksLeft} semana(s) restante(s)`}
                  variant="large"
                />
                <BudgetCard
                  label="Disponible semanal"
                  amount={weeklyDisposable}
                  sublabel="Para gastar por semana"
                />
                <BudgetCard
                  label="Disponible diario"
                  amount={dailyDisposable}
                  sublabel="Para gastar por día"
                />
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Gastos fijos mensuales
                </h2>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={openAdd}>
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Definí los gastos que tenés todos los meses (alquiler, servicios, suscripciones). Se restan del ingreso para calcular cuánto te queda para gastar.
              </p>

              <AnimatePresence mode="wait">
                {(adding || editingId) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-6 border border-border p-6"
                  >
                    <h3 className="mb-4 font-serif text-sm font-light">
                      {editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}
                    </h3>
                    <form onSubmit={(e) => handleSaveBudget(e, editingId ?? undefined)} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Nombre
                        </label>
                        <Input
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Ej. Alquiler, Luz"
                          className="h-12 border-border bg-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Monto mensual
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={form.amount}
                          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9,.]/g, "") }))}
                          placeholder="0"
                          className="h-12 border-border bg-transparent font-serif"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Fechas de pago en el mes (quincena 1–15, 16–fin)
                          </label>
                          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={addDueDate}>
                            + Fecha
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Día del mes (1–31) y % que se paga ese día. La suma debe dar 100%.
                        </p>
                        <ul className="space-y-2">
                          {form.dueDates.map((d, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={31}
                                value={d.day_of_month || ""}
                                onChange={(e) => updateDueDate(i, "day_of_month", parseInt(e.target.value, 10) || 1)}
                                className="h-10 w-20 border-border bg-transparent"
                                placeholder="Día"
                              />
                              <span className="text-muted-foreground">→</span>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={d.percentage || ""}
                                onChange={(e) => updateDueDate(i, "percentage", parseFloat(e.target.value) || 0)}
                                className="h-10 w-24 border-border bg-transparent"
                                placeholder="%"
                              />
                              <span className="text-muted-foreground">%</span>
                              {form.dueDates.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-destructive" onClick={() => removeDueDate(i)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-muted-foreground">
                          Suma: {form.dueDates.reduce((s, d) => s + d.percentage, 0).toFixed(0)}%
                        </p>
                      </div>
                      {formError && <p className="text-sm text-destructive">{formError}</p>}
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={cancelForm} disabled={formLoading}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={formLoading} className="flex-1 bg-foreground text-background hover:bg-foreground/90">
                          {formLoading ? "Guardando…" : "Guardar"}
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <ul className="space-y-2">
                {budgets
                  .filter((b) => b.period === "monthly")
                  .map((b) => {
                    const paid = isPaidThisMonth(b.id);
                    return (
                      <motion.li
                        key={b.id}
                        layout
                        className={`flex items-center justify-between border p-4 ${paid ? "border-success/50 bg-success/5" : "border-border"}`}
                      >
                        <div>
                          <p className="font-medium text-foreground">{b.name}</p>
                          <p className="font-serif text-lg tracking-tight text-foreground">
                            {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(Number(b.amount))}{" "}
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ mes</span>
                          </p>
                          {paid && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-success">
                              <Check className="h-3.5 w-3.5" />
                              Cubierto este mes
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={paid ? "outline" : "default"}
                            size="sm"
                            className={paid ? "gap-1.5 border-success text-success hover:bg-success/10" : "gap-1.5 bg-foreground text-background hover:bg-foreground/90"}
                            onClick={() => togglePaid(b)}
                            disabled={formLoading}
                          >
                            {paid ? (
                              <>
                                <Circle className="h-3.5 w-3.5" />
                                Desmarcar
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Marcar como cubierto
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEdit(b)}
                            disabled={!!editingId || !!adding}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(b)}
                            disabled={formLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </motion.li>
                    );
                  })}
              </ul>

              {budgets.filter((b) => b.period === "monthly").length === 0 && !adding && (
                <div className="border border-dashed border-border py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Sin gastos fijos. Agregá alquiler, servicios y suscripciones para calcular tu disponible real.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
