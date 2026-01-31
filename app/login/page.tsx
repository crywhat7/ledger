"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/session";
import { UsernameStep } from "@/components/UsernameStep";
import { PinPad } from "@/components/PinPad";

export default function LoginPage() {
  const router = useRouter();
  const { session, hydrate, rememberUsername, getLastUsername } = useSessionStore();
  const [step, setStep] = useState<"username" | "pin">("username");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const last = getLastUsername();
    if (last) setUsername(last);
  }, [getLastUsername]);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  function handleUsernameVerified(u: string) {
    setUsername(u);
    rememberUsername(u);
    setError("");
    setStep("pin");
  }

  function handlePinSuccess() {
    router.replace("/dashboard");
  }

  function handleBack() {
    setStep("username");
    setError("");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AnimatePresence mode="wait">
        {step === "username" ? (
          <motion.div
            key="username"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-1 flex-col items-center justify-center px-6 py-12"
          >
            <div className="mb-16 w-full max-w-sm text-center">
              <h1 className="font-serif text-5xl font-light tracking-tighter text-foreground">
                Ledger
              </h1>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="h-px w-8 bg-border" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Finanzas personales
                </span>
                <div className="h-px w-8 bg-border" />
              </div>
            </div>
            <UsernameStep
              initialUsername={username}
              onVerified={handleUsernameVerified}
              onError={setError}
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}
            <p className="mt-12 text-center text-xs text-muted-foreground">
              Sin usuarios aún. Creá uno en <span className="font-mono">/vault-admin</span>.
            </p>
          </motion.div>
        ) : (
          <PinPad
            key="pin"
            username={username}
            error={error}
            onSuccess={handlePinSuccess}
            onError={setError}
            onBack={handleBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
