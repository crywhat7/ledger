"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type Props = { userId: string };

export function SettingsNotifications({ userId }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/notifications/status?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setEnabled(Boolean(data.enabled)))
      .catch(() => setEnabled(false));
  }, [userId]);

  async function subscribe() {
    if (!VAPID_PUBLIC) {
      setError("Notificaciones no configuradas en el servidor.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("Tu navegador no soporta notificaciones push.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setError("Permiso de notificaciones denegado.");
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC);
      const keyBuffer = new ArrayBuffer(keyBytes.length);
      new Uint8Array(keyBuffer).set(keyBytes);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array(keyBuffer),
      });
      const subscriptionJson = sub.toJSON?.() ?? {
        endpoint: sub.endpoint,
        keys: {
          p256dh: arrayBufferToBase64Url(sub.getKey("p256dh")),
          auth: arrayBufferToBase64Url(sub.getKey("auth")),
        },
      };
      const keys = subscriptionJson.keys ?? {
        p256dh: arrayBufferToBase64Url(sub.getKey("p256dh")),
        auth: arrayBufferToBase64Url(sub.getKey("auth")),
      };
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          subscription: {
            endpoint: subscriptionJson.endpoint,
            keys,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al activar");
      }
      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al activar notificaciones.");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setEnabled(false);
    } catch {
      setError("Error al desactivar.");
    } finally {
      setLoading(false);
    }
  }

  if (enabled === null) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Recibí un recordatorio a las 7:30 (disponible por día) y a las 21:00 (disponible por semana) en este dispositivo o en el celular si abrís la app desde el navegador.
      </p>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="text-sm text-foreground">Notificaciones activadas</span>
          <Button
            variant="outline"
            size="sm"
            onClick={unsubscribe}
            disabled={loading}
          >
            Desactivar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError(null);
              setTestMessage(null);
              try {
                const res = await fetch("/api/notifications/test", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || "Error al enviar");
                setTestMessage("Enviada. Revisá la esquina de la pantalla o el centro de notificaciones.");
                setError(null);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Error al enviar prueba");
                setTestMessage(null);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Enviando…" : "Enviar notificación de prueba"}
          </Button>
        </div>
      ) : (
        <Button
          onClick={subscribe}
          disabled={loading || !VAPID_PUBLIC}
          className="gap-2"
        >
          <BellOff className="h-4 w-4" />
          {loading ? "Activando…" : "Activar notificaciones"}
        </Button>
      )}
      {testMessage && (
        <p className="text-sm text-green-600 dark:text-green-400" role="status">
          {testMessage}
        </p>
      )}
    </div>
  );
}
