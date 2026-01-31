"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, CreditCard, Wallet, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Account } from "@/types/database";

type AccountType = "cash" | "bank" | "credit_card";

const TYPE_LABEL: Record<AccountType, string> = {
  cash: "Efectivo",
  bank: "Banco",
  credit_card: "Tarjeta de crédito",
};

const TYPE_ICON: Record<AccountType, typeof Wallet> = {
  cash: Banknote,
  bank: Wallet,
  credit_card: CreditCard,
};

interface SettingsAccountsProps {
  userId: string;
  accounts: Account[];
  onRefresh: () => void;
}

export function SettingsAccounts({ userId, accounts, onRefresh }: SettingsAccountsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "bank" as AccountType,
    balance: "",
    credit_limit: "",
    billing_cycle_day: "",
    payment_due_day: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openAdd() {
    setAdding(true);
    setEditingId(null);
    setForm({
      name: "",
      type: "bank",
      balance: "",
      credit_limit: "",
      billing_cycle_day: "",
      payment_due_day: "",
    });
    setError("");
  }

  function openEdit(acc: Account) {
    setEditingId(acc.id);
    setAdding(false);
    const bal = Number(acc.balance);
    setForm({
      name: acc.name,
      type: acc.type as AccountType,
      balance: acc.type === "credit_card" ? String(Math.abs(bal)) : String(bal),
      credit_limit: acc.credit_limit != null ? String(acc.credit_limit) : "",
      billing_cycle_day: acc.billing_cycle_day != null ? String(acc.billing_cycle_day) : "",
      payment_due_day: acc.payment_due_day != null ? String(acc.payment_due_day) : "",
    });
    setError("");
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent, accountId?: string) {
    e.preventDefault();
    setError("");
    const name = form.name.trim();
    if (!name) {
      setError("Nombre requerido");
      return;
    }
    const balance = parseFloat(form.balance.replace(",", ".")) || 0;
    const creditLimit = form.type === "credit_card" ? parseFloat(form.credit_limit.replace(",", ".")) || null : null;
    const billingCycle = form.type === "credit_card" && form.billing_cycle_day ? parseInt(form.billing_cycle_day, 10) : null;
    const paymentDue = form.type === "credit_card" && form.payment_due_day ? parseInt(form.payment_due_day, 10) : null;

    setLoading(true);
    try {
      if (accountId) {
        const payload: Record<string, unknown> = {
          name,
          type: form.type,
          credit_limit: creditLimit,
          billing_cycle_day: billingCycle,
          payment_due_day: paymentDue,
        };
        if (form.type !== "credit_card") payload.balance = balance;
        else payload.balance = -Math.abs(balance);
        const { error: err } = await supabase.from("accounts").update(payload).eq("id", accountId).eq("user_id", userId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("accounts").insert({
          user_id: userId,
          name,
          type: form.type,
          balance: form.type === "credit_card" ? -Math.abs(balance) : balance,
          credit_limit: creditLimit,
          billing_cycle_day: billingCycle,
          payment_due_day: paymentDue,
        });
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

  async function handleDelete(acc: Account) {
    if (!confirm(`¿Eliminar la cuenta "${acc.name}"? Se perderán los movimientos asociados.`)) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from("accounts").delete().eq("id", acc.id).eq("user_id", userId);
      if (err) throw err;
      onRefresh();
      cancel();
    } catch {
      setError("No se pudo eliminar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Tus cuentas
        </h2>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Agregar cuenta
        </Button>
      </div>

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
            <h3 className="mb-4 font-serif text-sm font-light">Nueva cuenta</h3>
            <AccountForm
              form={form}
              setForm={setForm}
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
            <h3 className="mb-4 font-serif text-sm font-light">Editar cuenta</h3>
            <AccountForm
              form={form}
              setForm={setForm}
              loading={loading}
              onSubmit={(e) => handleSubmit(e, editingId)}
              onCancel={cancel}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ul className="space-y-2">
        {accounts.map((acc) => (
          <motion.li
            key={acc.id}
            layout
            className={cn(
              "flex items-center justify-between border border-border p-4",
              editingId === acc.id && "border-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center border border-border">
                {(() => {
                  const Icon = TYPE_ICON[acc.type as AccountType];
                  return Icon ? <Icon className="h-5 w-5 text-muted-foreground" /> : null;
                })()}
              </div>
              <div>
                <p className="font-medium text-foreground">{acc.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {TYPE_LABEL[acc.type as AccountType]} ·{" "}
                  {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(Number(acc.balance))}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => openEdit(acc)}
                disabled={!!editingId || !!adding}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => handleDelete(acc)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Eliminar</span>
              </Button>
            </div>
          </motion.li>
        ))}
      </ul>

      {accounts.length === 0 && !adding && (
        <div className="border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">Sin cuentas. Agregá una para registrar movimientos.</p>
        </div>
      )}
    </section>
  );
}

function AccountForm({
  form,
  setForm,
  loading,
  onSubmit,
  onCancel,
}: {
  form: { name: string; type: AccountType; balance: string; credit_limit: string; billing_cycle_day: string; payment_due_day: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
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
          placeholder="Ej. Banco, Efectivo, Visa"
          className="h-12 border-border bg-transparent"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</label>
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
          className="h-12 w-full border border-border bg-transparent px-4 text-foreground focus:border-foreground focus:outline-none"
        >
          <option value="cash">Efectivo</option>
          <option value="bank">Banco</option>
          <option value="credit_card">Tarjeta de crédito</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {form.type === "credit_card" ? "Saldo actual (deuda)" : "Saldo"}
        </label>
        <Input
          type="text"
          inputMode="decimal"
          value={form.type === "credit_card" && form.balance ? (form.balance.startsWith("-") ? form.balance : `-${form.balance}`) : form.balance}
          onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value.replace(/[^0-9,.]/g, "").replace(/^-/, "") }))}
          placeholder="0"
          className="h-12 border-border bg-transparent font-serif"
        />
      </div>
      {form.type === "credit_card" && (
        <>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Límite de crédito</label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.credit_limit}
              onChange={(e) => setForm((f) => ({ ...f, credit_limit: e.target.value.replace(/[^0-9,.]/g, "") }))}
              placeholder="0"
              className="h-12 border-border bg-transparent font-serif"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Día cierre (1–28)</label>
              <Input
                type="number"
                min={1}
                max={28}
                value={form.billing_cycle_day}
                onChange={(e) => setForm((f) => ({ ...f, billing_cycle_day: e.target.value }))}
                placeholder="15"
                className="h-12 border-border bg-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Vencimiento (1–31)</label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.payment_due_day}
                onChange={(e) => setForm((f) => ({ ...f, payment_due_day: e.target.value }))}
                placeholder="25"
                className="h-12 border-border bg-transparent"
              />
            </div>
          </div>
        </>
      )}
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
