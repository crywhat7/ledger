"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

interface VaultGateProps {
  onUnlock: (pin: string) => void;
  error: string | null;
  onError: (msg: string) => void;
}

export function VaultGate({ onUnlock, error, onError }: VaultGateProps) {
  const [pin, setPin] = useState<string[]>([]);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (error) {
      setShake(true);
      setPin([]);
      setTimeout(() => setShake(false), 500);
    }
  }, [error]);

  const addDigit = useCallback(
    (d: string) => {
      if (d === "del") {
        setPin((p) => p.slice(0, -1));
        return;
      }
      if (d === "" || pin.length >= 6) return;
      const newPin = [...pin, d];
      setPin(newPin);
      if (newPin.length === 6) {
        onError("");
        onUnlock(newPin.join(""));
      }
    },
    [pin, onUnlock, onError]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-12 text-center">
          <h1 className="font-serif text-3xl font-light tracking-tight text-foreground">
            Vault Access
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ingresá la clave maestra para continuar
          </p>
        </div>

        <motion.div
          className="mb-8 flex items-center justify-center gap-4"
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3 w-3 rounded-full border transition-all duration-200",
                pin.length > i ? "border-foreground bg-foreground" : "border-border bg-transparent"
              )}
            />
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 text-center text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-3">
          {DIGITS.map((digit, i) => (
            <div key={i} className="flex aspect-square items-center justify-center">
              {digit === "" ? (
                <div />
              ) : digit === "del" ? (
                <motion.button
                  type="button"
                  onClick={() => setPin((p) => p.slice(0, -1))}
                  disabled={pin.length === 0}
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full border border-border bg-transparent text-foreground transition-colors hover:bg-secondary active:scale-95 disabled:opacity-30"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <Delete className="h-5 w-5" />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => addDigit(digit)}
                  disabled={pin.length >= 6}
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full border border-border bg-transparent font-serif text-2xl font-light text-foreground transition-colors hover:bg-secondary active:scale-95 disabled:opacity-30"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  {digit}
                </motion.button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
