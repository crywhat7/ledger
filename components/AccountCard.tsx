"use client";

import { motion } from "framer-motion";
import { CreditCard, Wallet, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account } from "@/types/database";

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

const iconMap: Record<string, typeof Wallet> = {
  cash: Banknote,
  bank: Wallet,
  credit_card: CreditCard,
};

export function AccountCard({ account, onClick }: AccountCardProps) {
  const Icon = iconMap[account.type] ?? Wallet;

  const formatCurrency = (value: number) => {
    const isNegative = value < 0;
    const formatted = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Math.abs(value));
    return isNegative ? `-${formatted}` : formatted;
  };

  const isCredit = account.type === "credit_card";
  const utilization =
    isCredit && account.credit_limit
      ? (Math.abs(account.balance) / account.credit_limit) * 100
      : 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full border border-border p-4 text-left transition-colors",
        "hover:border-foreground hover:bg-secondary/50",
        "focus:outline-none focus:ring-1 focus:ring-foreground"
      )}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-border">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{account.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {account.type.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <p
          className={cn(
            "font-serif text-2xl tracking-tight",
            account.balance < 0 && "text-destructive"
          )}
        >
          {formatCurrency(account.balance)}
        </p>
        {isCredit && account.credit_limit != null && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Uso de crédito</span>
              <span>{utilization.toFixed(0)}%</span>
            </div>
            <div className="mt-1 h-1 w-full bg-border">
              <div
                className={cn(
                  "h-full transition-all",
                  utilization > 80 ? "bg-destructive" : "bg-foreground"
                )}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.button>
  );
}
