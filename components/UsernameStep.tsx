"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UsernameStepProps {
  initialUsername: string;
  onVerified: (username: string) => void;
  onError: (message: string) => void;
}

export function UsernameStep({ initialUsername, onVerified, onError }: UsernameStepProps) {
  const [username, setUsername] = useState(initialUsername || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      onError("Ingresa tu usuario");
      return;
    }
    setLoading(true);
    onError("");
    try {
      const { checkUsernameExists } = await import("@/lib/auth");
      const exists = await checkUsernameExists(trimmed);
      if (exists) {
        onVerified(trimmed);
      } else {
        onError("Usuario no encontrado");
      }
    } catch {
      onError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-sm space-y-6">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Usuario
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                onError("");
              }}
              placeholder="Tu usuario"
              autoComplete="username"
              autoFocus
              className="h-12 border-border bg-transparent font-light placeholder:text-muted-foreground/50 focus:border-foreground"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={!username.trim() || loading}
            className="mt-6 h-12 w-full gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.form>
      </div>
    </motion.div>
  );
}
