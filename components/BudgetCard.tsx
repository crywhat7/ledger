"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BudgetCardProps {
  label: string;
  amount: number | null;
  sublabel?: string;
  variant?: "default" | "large";
  trend?: "up" | "down" | "neutral";
}

export function BudgetCard({
  label,
  amount,
  sublabel,
  variant = "default",
  trend = "neutral",
}: BudgetCardProps) {
  const formatCurrency = (value: number) => {
    const isNegative = value < 0;
    const formatted = new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    return isNegative ? `-${formatted}` : formatted;
  };

  const displayAmount = amount !== null ? formatCurrency(amount) : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border border-border p-4 sm:p-6",
        variant === "large" && "col-span-full"
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
        {trend !== "neutral" && (
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider",
              trend === "up" ? "text-success" : "text-destructive"
            )}
          >
            {trend === "up" ? "+" : "-"}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 font-serif tracking-tight",
          variant === "large" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
          amount !== null && amount < 0 && "text-destructive"
        )}
      >
        {displayAmount}
      </p>
      {sublabel && (
        <p className="mt-2 text-xs text-muted-foreground">
          {sublabel}
        </p>
      )}
    </motion.div>
  );
}
