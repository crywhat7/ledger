"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";

type AccountType = "cash" | "bank" | "credit_card";

interface AddAccountFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddAccountForm({ userId, onSuccess, onCancel }: AddAccountFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Nombre requerido");
      return;
    }
    const numBalance = parseFloat(balance.replace(",", ".")) || 0;
    const numLimit = type === "credit_card" ? parseFloat(creditLimit.replace(",", ".")) || 0 : null;

    setLoading(true);
    try {
      const { error: err } = await supabase.from("accounts").insert({
        user_id: userId,
        name: trimmed,
        type,
        balance: type === "credit_card" ? -Math.abs(numBalance) : numBalance,
        credit_limit: type === "credit_card" && numLimit && numLimit > 0 ? numLimit : null,
      });
      if (err) throw err;
      onSuccess();
    } catch {
      setError("No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Nombre
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Banco, Efectivo, Visa"
          className="h-12 border-border bg-transparent"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Tipo
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="h-12 w-full border border-border bg-transparent px-4 text-foreground focus:border-foreground focus:outline-none"
        >
          <option value="cash">Efectivo</option>
          <option value="bank">Banco</option>
          <option value="credit_card">Tarjeta de crédito</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {type === "credit_card" ? "Saldo actual (deuda)" : "Saldo inicial"}
        </label>
        <Input
          type="text"
          inputMode="decimal"
          value={type === "credit_card" ? (balance ? `-${balance}` : "") : balance}
          onChange={(e) => setBalance(e.target.value.replace(/[^0-9,.]/g, "").replace(/^-/, ""))}
          placeholder="0"
          className="h-12 border-border bg-transparent font-serif"
        />
      </div>
      {type === "credit_card" && (
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Límite de crédito (opcional)
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value.replace(/[^0-9,.]/g, ""))}
            placeholder="0"
            className="h-12 border-border bg-transparent font-serif"
          />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-foreground text-background hover:bg-foreground/90">
          {loading ? "Guardando…" : "Crear cuenta"}
        </Button>
      </div>
    </form>
  );
}
