"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { getMonthKey } from "@/lib/budget";
import type { Account } from "@/types/database";
import type { Budget } from "@/types/database";

type TransactionType = "income" | "expense" | "transfer" | "cc_charge" | "cc_payment";

const TYPES: { type: TransactionType; label: string; icon: typeof ArrowUpRight }[] = [
  { type: "income", label: "Ingreso", icon: ArrowDownLeft },
  { type: "expense", label: "Gasto", icon: ArrowUpRight },
  { type: "transfer", label: "Transferencia", icon: ArrowLeftRight },
  { type: "cc_charge", label: "Cargo CC", icon: CreditCard },
];

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  defaultAccountId?: string;
  accounts: Account[];
  userId: string;
  onSuccess?: () => void;
  playSound?: () => void;
}

function getDefaultConcept(type: TransactionType): string {
  switch (type) {
    case "income":
      return "Ingreso";
    case "expense":
      return "Gasto";
    case "transfer":
      return "Transferencia";
    case "cc_charge":
      return "Cargo tarjeta";
    case "cc_payment":
      return "Pago tarjeta";
    default:
      return "Movimiento";
  }
}

export function QuickAddModal({
  isOpen,
  onClose,
  defaultType = "expense",
  defaultAccountId,
  accounts,
  userId,
  onSuccess,
  playSound,
}: QuickAddModalProps) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [accountId, setAccountId] = useState(defaultAccountId || "");
  const [toAccountId, setToAccountId] = useState("");
  const [ccAccountId, setCcAccountId] = useState("");
  const [isFixedExpense, setIsFixedExpense] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [fixedBudgets, setFixedBudgets] = useState<Budget[]>([]);
  const [paidThisMonthIds, setPaidThisMonthIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setAccountId(defaultAccountId || accounts[0]?.id || "");
      setToAccountId("");
      setCcAccountId("");
      setAmount("");
      setConcept("");
      setIsFixedExpense(false);
      setSelectedBudgetId(null);
      setError("");
      setTimeout(() => amountRef.current?.focus(), 100);
    }
  }, [isOpen, defaultType, defaultAccountId, accounts]);

  useEffect(() => {
    if (!isOpen || type !== "expense" || !userId) return;
    const month = getMonthKey(new Date());
    (async () => {
      const [budgRes, paidRes] = await Promise.all([
        supabase
          .from("budgets")
          .select("*")
          .eq("user_id", userId)
          .eq("period", "monthly")
          .order("name"),
        supabase
          .from("budget_month_paid")
          .select("budget_id")
          .eq("user_id", userId)
          .eq("month", month),
      ]);
      setFixedBudgets(budgRes.data ?? []);
      setPaidThisMonthIds(new Set((paidRes.data ?? []).map((p) => p.budget_id)));
    })();
  }, [isOpen, type, userId]);

  useEffect(() => {
    if (type !== "expense") {
      setIsFixedExpense(false);
      setSelectedBudgetId(null);
    }
  }, [type]);

  useEffect(() => {
    if (selectedBudgetId && fixedBudgets.length) {
      const b = fixedBudgets.find((x) => x.id === selectedBudgetId);
      if (b) {
        setAmount(String(Number(b.amount)));
        setConcept(b.name);
      }
    }
  }, [selectedBudgetId, fixedBudgets]);

  const filteredFromAccounts = accounts.filter((a) => {
    if (type === "cc_charge") return a.type !== "credit_card";
    if (type === "cc_payment") return a.type !== "credit_card";
    return true;
  });

  const toAccounts = accounts.filter((a) => {
    if (type === "transfer") return a.id !== accountId;
    if (type === "cc_payment") return a.type === "credit_card";
    return false;
  });

  const ccAccounts = accounts.filter((a) => a.type === "credit_card");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const num = parseFloat(amount.replace(",", "."));
    if (!num || num <= 0) {
      setError("Monto inválido");
      return;
    }
    if (!accountId) {
      setError("Elegí una cuenta");
      return;
    }
    if (type === "transfer" && !toAccountId) {
      setError("Elegí cuenta destino");
      return;
    }
    if ((type === "cc_charge" || type === "cc_payment") && !ccAccountId) {
      setError("Elegí la tarjeta");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        userId,
        type,
        amount: num,
        concept: concept.trim() || getDefaultConcept(type),
        account_id: accountId,
        transaction_date: new Date().toISOString().split("T")[0],
      };
      if (type === "transfer") payload.to_account_id = toAccountId;
      if (type === "cc_charge" || type === "cc_payment") payload.credit_card_account_id = ccAccountId;

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        return;
      }
      if (type === "expense" && selectedBudgetId) {
        const month = getMonthKey(new Date());
        const { error: paidError } = await supabase.from("budget_month_paid").insert({
          user_id: userId,
          budget_id: selectedBudgetId,
          month,
        });
        if (paidError && paidError.code !== "23505") {
          setError("Movimiento guardado pero no se marcó el gasto fijo como pagado.");
        }
      }
      playSound?.();
      onSuccess?.();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto border-t border-border bg-background"
          >
            <div className="mx-auto max-w-lg px-6 py-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-serif text-xl font-light text-foreground">Agregar movimiento</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="size-8">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cerrar</span>
                </Button>
              </div>

              <div className="mb-6 grid grid-cols-4 gap-2">
                {TYPES.map(({ type: t, label, icon: Icon }) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "flex flex-col items-center gap-1 border p-3 transition-colors",
                      type === t
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-wider">{label}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Monto
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-serif text-2xl text-muted-foreground">
                      L
                    </span>
                    <Input
                      ref={amountRef}
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ""))}
                      placeholder="0.00"
                      className="h-14 pl-10 font-serif text-2xl border-border bg-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Concepto
                  </label>
                  <Input
                    type="text"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder={getDefaultConcept(type)}
                    className="h-12 border-border bg-transparent"
                  />
                </div>

                {type === "expense" && (
                  <>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isFixedExpense}
                        onClick={() => {
                          setIsFixedExpense((v) => !v);
                          if (isFixedExpense) setSelectedBudgetId(null);
                        }}
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center border transition-colors",
                          isFixedExpense ? "border-foreground bg-foreground text-background" : "border-border"
                        )}
                      >
                        {isFixedExpense && <CheckSquare className="h-3.5 w-3.5" />}
                      </button>
                      <span className="text-sm text-foreground">¿Es para un gasto fijo?</span>
                    </div>
                    {isFixedExpense && fixedBudgets.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Gasto fijo
                        </label>
                        <select
                          value={selectedBudgetId ?? ""}
                          onChange={(e) => setSelectedBudgetId(e.target.value || null)}
                          className="h-12 w-full border border-border bg-transparent px-4 text-foreground focus:border-foreground focus:outline-none"
                        >
                          <option value="">Elegir gasto fijo</option>
                          {fixedBudgets.map((b) => {
                            const paid = paidThisMonthIds.has(b.id);
                            return (
                              <option key={b.id} value={b.id}>
                                {b.name} — L {new Intl.NumberFormat("es-HN").format(Number(b.amount))}
                                {paid ? " ✓ Pagado este mes" : ""}
                              </option>
                            );
                          })}
                        </select>
                        {selectedBudgetId && (
                          <p className="text-xs text-muted-foreground">
                            Monto y concepto se rellenaron; podés corroborarlos arriba antes de guardar.
                          </p>
                        )}
                      </div>
                    )}
                    {isFixedExpense && fixedBudgets.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No tenés gastos fijos mensuales. Agregá uno en Presupuesto.
                      </p>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {type === "transfer" ? "Desde cuenta" : "Cuenta"}
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="h-12 w-full border border-border bg-transparent px-4 text-foreground focus:border-foreground focus:outline-none"
                    required
                  >
                    <option value="">Elegir cuenta</option>
                    {filteredFromAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(Number(a.balance))}
                      </option>
                    ))}
                  </select>
                </div>

                {(type === "transfer" || type === "cc_payment") && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {type === "transfer" ? "A cuenta" : "Tarjeta a pagar"}
                    </label>
                    <select
                      value={type === "transfer" ? toAccountId : ccAccountId}
                      onChange={(e) =>
                        type === "transfer" ? setToAccountId(e.target.value) : setCcAccountId(e.target.value)
                      }
                      className="h-12 w-full border border-border bg-transparent px-4 text-foreground focus:border-foreground focus:outline-none"
                      required
                    >
                      <option value="">Elegir</option>
                      {(type === "transfer" ? toAccounts : ccAccounts).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {type === "cc_charge" && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Tarjeta
                    </label>
                    <select
                      value={ccAccountId}
                      onChange={(e) => setCcAccountId(e.target.value)}
                      className="h-12 w-full border border-border bg-transparent px-4 text-foreground focus:border-foreground focus:outline-none"
                      required
                    >
                      <option value="">Elegir tarjeta</option>
                      {ccAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full bg-foreground text-background hover:bg-foreground/90"
                >
                  {isSubmitting ? "Guardando…" : "Agregar"}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
