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

type PermissionStatus = "granted" | "denied" | "default" | null;

export function SettingsNotifications({ userId }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<PermissionStatus>(null);
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

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(
      Notification.permission === "granted"
        ? "granted"
        : Notification.permission === "denied"
          ? "denied"
          : "default"
    );
  }, [enabled]);

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
      setPermission("granted");
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
        Recibí un recordatorio a las 7:30 (disponible por día) y a las 21:00 (disponible por semana).
      </p>
      <p className="text-xs text-muted-foreground">
        Si no ves la notificación en pantalla: 1) Revisá el centro de notificaciones de Windows (ícono junto al reloj). 2) Configuración de Windows → Sistema → Notificaciones → asegurate que Chrome y &quot;No molestar&quot; no estén silenciando. 3) En Chrome: configuración → Privacidad → Configuración de sitios → Notificaciones → que este sitio esté en &quot;Permitir&quot;.
      </p>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {enabled ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Bell className="h-5 w-5 text-foreground" />
            <span className="text-sm text-foreground">Notificaciones activadas</span>
            {permission !== null && (
              <span
                className={`text-xs ${
                  permission === "granted"
                    ? "text-green-600 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                Permiso: {permission === "granted" ? "permitido" : permission === "denied" ? "denegado" : "no decidido"}
              </span>
            )}
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
                if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
                  setError("El permiso de notificaciones no está permitido. Tocá el candado (o la i) en la barra de direcciones → Configuración del sitio → Notificaciones → Permitir.");
                  return;
                }
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
                  setTestMessage("Enviada. Revisá la esquina de la pantalla o el centro de notificaciones. Si no ves nada: 1) Minimizá la ventana o abrí otra pestaña. 2) Cerrá todas las pestañas de la app y volvé a abrirla (actualiza el Service Worker).");
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
          {permission === "denied" && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              El navegador tiene las notificaciones denegadas para este sitio. Sin permiso no vas a recibir ninguna. Abrí la configuración del sitio (candado o i en la barra de direcciones) y cambiá Notificaciones a &quot;Permitir&quot;.
            </p>
          )}
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
