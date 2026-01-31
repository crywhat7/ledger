"use client";

import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IncomeRequiredAlertProps {
  onAddIncome?: () => void;
  onDismiss?: () => void;
}

export function IncomeRequiredAlert({ onAddIncome, onDismiss }: IncomeRequiredAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden border border-foreground bg-foreground text-background"
    >
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="absolute right-2 top-2 size-8 text-background/70 hover:bg-background/20 hover:text-background"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 1px,
            currentColor 1px,
            currentColor 2px
          )`,
          backgroundSize: "8px 100%",
        }}
      />
      <div className="relative px-6 py-8 text-center sm:px-12 sm:py-12">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="h-px w-8 bg-background/30" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-background/60">
            Acción requerida
          </span>
          <div className="h-px w-8 bg-background/30" />
        </div>
        <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl">
          Ingreso pendiente
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-background/70">
          Hoy es día de cobro. Registrá tu ingreso para actualizar el presupuesto y calcular el
          disponible semanal.
        </p>
        {onAddIncome && (
          <motion.div
            className="mt-8"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={onAddIncome}
              className="h-12 gap-2 bg-background px-8 text-foreground hover:bg-background/90"
            >
              <Plus className="h-4 w-4" />
              Registrar ingreso
            </Button>
          </motion.div>
        )}
        <p className="mt-6 text-[10px] uppercase tracking-wider text-background/40">
          Después de registrar podés cerrar
        </p>
      </div>
    </motion.div>
  );
}
