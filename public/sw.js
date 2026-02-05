const CACHE = "ledger-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  const promise = (async () => {
    let data = { title: "Ledger", body: "", url: "/dashboard" };
    if (event.data) {
      try {
        const raw = event.data.json();
        if (raw && typeof raw === "object") data = { ...data, ...raw };
        else data.body = typeof raw === "string" ? raw : event.data.text() || "";
      } catch (_) {
        try {
          data.body = event.data.text() || "";
        } catch (_) {}
      }
    }
    const options = {
      body: data.body || "Nueva notificación",
      icon: "/file.svg",
      badge: "/file.svg",
      data: { url: data.url || "/dashboard" },
      tag: "ledger-notification",
      renotify: true,
      requireInteraction: true,
      silent: false,
    };
    try {
      await self.registration.showNotification(data.title || "Ledger", options);
    } catch (err) {
      console.error("[Ledger SW] showNotification failed:", err);
    }
  })();
  event.waitUntil(promise);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  const fullUrl = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url.startsWith("chrome-extension")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        if (res.ok && event.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || new Response("", { status: 503 })))
  );
});
