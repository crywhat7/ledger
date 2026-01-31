"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

interface PinPadProps {
  username: string;
  error: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
  onBack: () => void;
}

export function PinPad({ username, error, onSuccess, onError, onBack }: PinPadProps) {
  const [pin, setPin] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const addDigit = useCallback(
    (d: string) => {
      if (d === "del") {
        setPin((p) => p.slice(0, -1));
        return;
      }
      if (d === "" || pin.length >= 6 || loading) return;
      const newPin = [...pin, d];
      setPin(newPin);
      if (newPin.length === 6) {
        setLoading(true);
        onError("");
        setErrorState(null);
        (async () => {
          try {
            const { verifyPin } = await import("@/lib/auth");
            const session = await verifyPin(username, newPin.join(""));
            if (session) {
              const { useSessionStore } = await import("@/store/session");
              useSessionStore.getState().login(session);
              onSuccess();
            } else {
              onError("PIN incorrecto");
              setPin([]);
              setShake(true);
              setTimeout(() => setShake(false), 500);
            }
          } catch {
            onError("Error de conexión");
            setPin([]);
          } finally {
            setLoading(false);
          }
        })();
      }
    },
    [username, pin.length, loading, onSuccess, onError]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <h1 className="font-serif text-3xl font-light tracking-tight text-foreground">
            Hola, {username}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ingresá tu PIN de 6 dígitos
          </p>
        </div>

        <motion.div
          className="mb-8 flex items-center justify-center gap-4"
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "h-3 w-3 rounded-full border transition-all duration-200",
                pin.length > i ? "border-foreground bg-foreground" : "border-border bg-transparent"
              )}
              initial={false}
              animate={pin.length > i ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.15 }}
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
                  disabled={loading || pin.length === 0}
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full border border-border bg-transparent text-foreground transition-colors hover:bg-secondary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <Delete className="h-5 w-5" />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => addDigit(digit)}
                  disabled={loading || pin.length >= 6}
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full border border-border bg-transparent font-serif text-2xl font-light text-foreground transition-colors hover:bg-secondary active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  {digit}
                </motion.button>
              )}
            </div>
          ))}
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 flex justify-center"
            >
              <div className="h-1 w-24 overflow-hidden rounded-full bg-border">
                <motion.div
                  className="h-full w-1/2 bg-foreground"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={onBack}
          className="mt-8 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cambiar usuario
        </button>
      </div>
    </motion.div>
  );
}
