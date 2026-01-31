"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { VaultGate } from "@/components/VaultGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, User, ArrowLeft, Lock } from "lucide-react";

const MASTER_KEY = "213356";

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
}

export default function VaultAdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createUsername, setCreateUsername] = useState("");
  const [createPin, setCreatePin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    loadUsers();
  }, [unlocked]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/list-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterKey: MASTER_KEY }),
      });
      const data = await res.json();
      if (res.ok) setUsers(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }

  function handleMasterKeySubmit(pin: string) {
    if (pin === MASTER_KEY) {
      setUnlocked(true);
      setKeyError(null);
    } else {
      setKeyError("Clave incorrecta");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    if (!createUsername.trim()) {
      setCreateError("El usuario es obligatorio");
      return;
    }
    if (createPin.length !== 6 || !/^\d{6}$/.test(createPin)) {
      setCreateError("El PIN debe tener 6 dígitos");
      return;
    }
    if (createPin !== confirmPin) {
      setCreateError("Los PIN no coinciden");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterKey: MASTER_KEY,
          username: createUsername.trim().toLowerCase(),
          pin: createPin,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateSuccess(`Usuario "${data.username}" creado`);
        setCreateUsername("");
        setCreatePin("");
        setConfirmPin("");
        loadUsers();
      } else {
        setCreateError(data.error ?? "Error al crear usuario");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-1 w-24 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full w-1/2 bg-foreground"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <VaultGate
        onUnlock={handleMasterKeySubmit}
        error={keyError}
        onError={setKeyError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-2xl px-6 py-12"
      >
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-light tracking-tight text-foreground">
              Administración de usuarios
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Crear y gestionar cuentas de usuario
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Salir
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 border border-border p-6"
        >
          <h2 className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </h2>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="new-username"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Usuario
              </label>
              <Input
                id="new-username"
                type="text"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
                placeholder="Nombre de usuario"
                className="h-12 border-border bg-transparent"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="new-pin"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  PIN de 6 dígitos
                </label>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={createPin}
                  onChange={(e) => setCreatePin(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="h-12 border-border bg-transparent font-mono tracking-[0.5em]"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirm-pin"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Confirmar PIN
                </label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="h-12 border-border bg-transparent font-mono tracking-[0.5em]"
                />
              </div>
            </div>

            {createError && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive"
              >
                {createError}
              </motion.p>
            )}
            {createSuccess && (
              <p className="text-sm text-success">{createSuccess}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-foreground text-background hover:bg-foreground/90"
            >
              {loading ? "Creando…" : "Crear usuario"}
            </Button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <User className="h-4 w-4" />
            Usuarios existentes ({users.length})
          </h2>

          {users.length === 0 ? (
            <div className="border border-dashed border-border py-12 text-center">
              <Lock className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Aún no hay usuarios. Creá uno arriba.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex items-center justify-between border border-border p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      Creado {new Date(user.created_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
