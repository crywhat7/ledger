"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { useSessionStore } from "@/store/session";
import type { SessionData } from "@/lib/auth";

interface SettingsProfileProps {
  session: SessionData;
  onUpdate: () => void;
}

export function SettingsProfile({ session, onUpdate }: SettingsProfileProps) {
  const [displayName, setDisplayName] = useState(session.displayName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!session.apiKey) {
      setError("No tenés API key. Cerrando sesión y volviendo a entrar puede generarla.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.apiKey}`,
        },
        body: JSON.stringify({ display_name: displayName.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar");
        return;
      }
      setSuccess(true);
      const s = useSessionStore.getState().session;
      if (s) {
        useSessionStore.getState().setSession({
          ...s,
          displayName: displayName.trim() || null,
        });
      }
      onUpdate();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function copyApiKey() {
    if (!session.apiKey) return;
    try {
      await navigator.clipboard.writeText(session.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar");
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Datos del usuario
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Usuario (no editable)
            </label>
            <Input
              value={session.username}
              readOnly
              disabled
              className="h-12 border-border bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Nombre para mostrar
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej. Juan"
              className="h-12 border-border bg-transparent"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-success">Guardado.</p>}
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full bg-foreground text-background hover:bg-foreground/90"
          >
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </div>

      <div>
        <h2 className="mb-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          API para iOS Shortcuts
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Usá esta clave en Shortcuts para registrar gastos por POST a{" "}
          <code className="rounded bg-muted px-1 text-xs">/api/shortcuts/transaction</code> con{" "}
          <code className="rounded bg-muted px-1 text-xs">Authorization: Bearer &lt;api_key&gt;</code> y body{" "}
          <code className="rounded bg-muted px-1 text-xs">{"{ \"amount\", \"concept\", \"account_id\" }"}</code>.
        </p>
        {session.apiKey ? (
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={session.apiKey}
              className="h-12 flex-1 border-border bg-muted/50 font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12 shrink-0"
              onClick={copyApiKey}
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              <span className="sr-only">Copiar</span>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No tenés API key (usuarios creados antes de esta función). Creá un usuario nuevo en vault-admin o pedí regenerar la clave.
          </p>
        )}
      </div>
    </section>
  );
}
