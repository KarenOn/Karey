self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** Push Notifications */
self.addEventListener("push", (event) => {
  try {
    if (!event.data) return;

    const data = event.data.json();
    const title = data.title || "Notificación";
    const options = {
      body: data.body || "",
      icon: data.icon || "/icons/192x192.png",
      badge: data.badge || "/icons/192x192.png",
      data: {
        url: data.url || "/", // a dónde abrir cuando hagan click
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // Si esto crashea, el navegador dice "script evaluation failed"
    /* eslint-disable */console.error(...oo_tx(`1167617942_28_4_28_40_11`,"SW push error:", err));
  }
});

/** Click en notificación */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Si ya hay una pestaña abierta, enfócala
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      // Si no, abre nueva
      re