"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Account } from "@/types/database";
import type { IncomeSchedule } from "@/types/database";

interface SettingsIncomeProps {
  userId: string;
  accounts: Account[];
  incomeSchedules: IncomeSchedule[];
  onRefresh: () => void;
}

export function SettingsIncome({ userId, accounts, incomeSchedules, onRefresh }: SettingsIncomeProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    day_of_month: "1",
    percentage_of_total: "100",
    target_account_id: "",
    is_active: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openAdd() {
    setAdding(true);
    setEditingId(null);
    setForm({
      name: "",
      amount: "",
      day_of_month: "1",
      percentage_of_total: "100",
      target_account_id: accounts[0]?.id ?? "",
      is_active: true,
    });
    setError("");
  }

  function openEdit(sched: IncomeSchedule) {
    setEditingId(sched.id);
    setAdding(false);
    setForm({
      name: sched.name,
      amount: String(sched.amount),
      day_of_month: String(sched.day_of_month),
      percentage_of_total: String(sched.percentage_of_total),
      target_account_id: sched.target_account_id ?? "",
      is_active: sched.is_active,
    });
    setError("");
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent, scheduleId?: string) {
    e.preventDefault();
    setError("");
    const name = form.name.trim();
    if (!name) {
      setError("Nombre requerido");
      return;
    }
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!amount || amount <= 0) {
      setError("Monto debe ser mayor a 0");
      return;
    }
    const day = Math.min(31, Math.max(1, parseInt(form.day_of_month, 10) || 1));
    const pct = Math.min(100, Math.max(1, parseInt(form.percentage_of_total, 10) || 100));

    setLoading(true);
    try {
      const payload = {
        name,
        amount,
        day_of_month: day,
        percentage_of_total: pct,
        target_account_id: form.target_account_id || null,
        is_active: form.is_active,
      };
      if (scheduleId) {
        const { error: err } = await supabase
          .from("income_schedules")
          .update(payload)
          .eq("id", scheduleId)
          .eq("user_id", userId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("income_schedules")
          .insert({ user_id: userId, ...payload });
        if (err) throw err;
      }
      onRefresh();
      cancel();
    } catch {
      setError("No se pudo guardar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(sched: IncomeSchedule) {
    if (!confirm(`¿Eliminar el ingreso "${sched.name}"?`)) return;
    setLoading(true);
    try {
      const { error: err } = await supabase
        .from("income_schedules")
        .delete()
        .eq("id", sched.id)
        .eq("user_id", userId);
      if (err) throw err;
      onRefresh();
      cancel();
    } catch {
      setError("No se pudo eliminar");
    } finally {
      setLoading(false);
    }
  }

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Cuándo te pagan
        </h2>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Agregar ingreso
        </Button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Definí cada pago: día del mes, monto y qué porcentaje del total representa. Así la app sabe cuándo pedirte que registres el ingreso.
      </p>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <AnimatePresence mode="wait">
        {adding ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-6 border border-border p-6"
          >
            <h3 className="mb-4 font-serif text-sm font-light">Nuevo ingreso</h3>
            <IncomeForm
              form={form}
              setForm={setForm}
              accounts={accounts}
              loading={loading}
              onSubmit={(e) => handleSubmit(e)}
              onCancel={cancel}
            />
          </motion.div>
        ) : editingId ? (
          <motion.div
            key="edit-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-6 border border-border p-6"
          >
            <h3 className="mb-4 font-serif text-sm font-light">Editar ingreso</h3>
            <IncomeForm
              form={form}
              setForm={setForm}
              accounts={accounts}
              loading={loading}
              onSubmit={(e) => handleSubmit(e, editingId)}
              onCancel={cancel}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ul className="space-y-2">
        {incomeSchedules.map((sched) => (
          <motion.li
            key={sched.id}
            layout
            className={cn(
              "flex items-center justify-between border border-border p-4",
              editingId === sched.id && "border-foreground"
            )}
          >
            <div>
              <p className="font-medium text-foreground">{sched.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Día {sched.day_of_month} ·{" "}
                {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(Number(sched.amount))}{" "}
                · {sched.percentage_of_total}% del total · {accountName(sched.target_account_id)}
              </p>
              {!sched.is_active && (
                <span className="mt-1 inline-block text-[10px] uppercase text-muted-foreground">Inactivo</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => openEdit(sched)}
                disabled={!!editingId || !!adding}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => handleDelete(sched)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Eliminar</span>
              </Button>
            </div>
          </motion.li>
        ))}
      </ul>

      {incomeSchedules.length === 0 && !adding && (
        <div className="border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Sin ingresos configurados. Agregá cuándo te pagan para que la app te avise el día de cobro.
          </p>
        </div>
      )}
    </section>
  );
}

function IncomeForm({
  form,
  setForm,
  accounts,
  loading,
  onSubmit,
  onCancel,
}: {
  form: {
    name: string;
    amount: string;
    day_of_month: string;
    percentage_of_total: string;
    target_account_id: string;
    is_active: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  accounts: Account[];
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nombre</label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ej. Sueldo, Freelance"
          className="h-12 border-border bg-transparent"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Monto</label>
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
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Día del mes (1–31)</label>
          <Input
            type="number"
            min={1}
            max={31}
            value={form.day_of_month}
            onChange={(e) => setForm((f) => ({ ...f, day_of_month: e.target.value }))}
            placeholder="15"
            className="h-12 border-border bg-transparent"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Porcentaje del total (1–100)
        </label>
        <Input
          type="number"
          min={1}
          max={100}
          value={form.percentage_of_total}
          onChange={(e) => setForm((f) => ({ ...f, percentage_of_total: e.target.value }))}
          placeholder="100"
          className="h-12 border-border bg-transparent"
        />
        <p className="text-xs text-muted-foreground">
          Si tenés varios ingresos, repartí el total: ej. 30% primer pago, 70% segundo.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cuenta destino</label>
        <select
          value={form.target_account_id}
          onChange={(e) => setForm((f) => ({ ...f, target_account_id: e.target.value }))}
          className="h-12 w-full border border-border bg-transparent px-4 text-foreground focus:border-foreground focus:outline-none"
        >
          <option value="">Sin asignar</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          className="h-4 w-4 border-border"
        />
        <span className="text-sm text-muted-foreground">Activo (avisar el día de cobro)</span>
      </label>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-foreground text-background hover:bg-foreground/90">
          {loading ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
