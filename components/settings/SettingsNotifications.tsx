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

  // Pedir permiso apenas cargue (si está en default)
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

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
      setError("Este navegador no soporta notificaciones push.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setError("Permiso denegado.");
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
      setError(e instanceof Error ? e.message : "Error al activar.");
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

  function handleTest() {
    if (!("Notification" in window)) {
      setError("Este navegador no soporta notificaciones.");
      return;
    }
    if (Notification.permission !== "granted") {
      setError("No hay permiso para mostrar notificaciones.");
      return;
    }
    setError(null);
    new Notification("Ledger", {
      body: "Esta es una notificación de prueba.",
      icon: "/file.svg",
    });
  }

  if (!("Notification" in window)) {
    return (
      <p className="text-sm text-muted-foreground">
        Este navegador no soporta notificaciones.
      </p>
    );
  }

  if (enabled === null) {
    return <div className="py-4 text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Recordatorios a las 7:30 (disponible por día) y 21:00 (disponible por semana).
      </p>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="text-sm text-foreground">Activadas</span>
          <Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading}>
            Desactivar
          </Button>
          <Button variant="outline" size="sm" onClick={handleTest}>
            Enviar notificación de prueba
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
    </div>
  );
}
