"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<"+" | "-" | "×" | "÷" | null>(null);

  const compute = useCallback(
    (a: number, b: number, operation: "+" | "-" | "×" | "÷") => {
      if (operation === "+") return a + b;
      if (operation === "-") return a - b;
      if (operation === "×") return a * b;
      return b === 0 ? 0 : a / b;
    },
    []
  );

  const handleDigit = (d: string) => {
    setDisplay((s) => {
      if (s === "0" && d !== ".") return d;
      if (d === "." && s.includes(".")) return s;
      if (s === "0" && d === ".") return "0.";
      return s + d;
    });
  };

  const handleOperator = (nextOp: "+" | "-" | "×" | "÷") => {
    const current = parseFloat(display.replace(/,/g, ".")) || 0;
    if (prev !== null && op !== null) {
      const result = compute(prev, current, op);
      setPrev(Math.round(result * 100) / 100);
      setOp(nextOp);
      setDisplay("0");
    } else {
      setPrev(current);
      setOp(nextOp);
      setDisplay("0");
    }
  };

  const handleEquals = () => {
    if (prev === null || op === null) return;
    const current = parseFloat(display.replace(/,/g, ".")) || 0;
    const result = compute(prev, current, op);
    setDisplay(String(Math.round(result * 100) / 100));
    setPrev(null);
    setOp(null);
  };

  const handleClear = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
  };

  if (!isOpen) return null;

  const buttons = [
    ["C", "÷", "×", "-"],
    ["7", "8", "9", "+"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["0", ".", "="],
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="w-full max-w-[280px] rounded-lg border border-border bg-background p-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Calculadora
            </span>
            <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </div>
          <div className="mb-4 flex h-12 items-center justify-end rounded border border-border bg-muted/30 px-3 font-mono text-xl tabular-nums text-foreground">
            {display}
          </div>
          <div className="grid gap-2">
            {buttons.map((row, i) => (
              <div key={i} className="flex gap-2">
                {row.map((key) => {
                  if (key === "C") {
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        className="flex-1 font-mono"
                        onClick={handleClear}
                      >
                        C
                      </Button>
                    );
                  }
                  if (key === "=") {
                    return (
                      <Button
                        key={key}
                        className="flex-1 font-mono"
                        onClick={handleEquals}
                      >
                        =
                      </Button>
                    );
                  }
                  if (["+", "-", "×", "÷"].includes(key)) {
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        className="flex-1 font-mono"
                        onClick={() => handleOperator(key as "+" | "-" | "×" | "÷")}
                      >
                        {key}
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      className="flex-1 font-mono"
                      onClick={() => handleDigit(key)}
                    >
                      {key}
                    </Button>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
