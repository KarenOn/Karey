const SW_VERSION = "kiskeyavet-v2";
const STATIC_CACHE = `${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;
const APP_SHELL = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/192x192.png",
  "/icons/512x512.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

function isCacheableResponse(response) {
  return !!response && (response.ok || response.type === "opaque");
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    /\.(?:css|js|mjs|png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/i.test(pathname)
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }

  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const offline = await caches.match("/offline");
    if (offline) {
      return offline;
    }

    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => ![STATIC_CACHE, RUNTIME_CACHE].includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  event.waitUntil(
    (async () => {
      try {
        const data = event.data.json();
        const title = data.title || "Notificacion";
        const options = {
          badge: data.badge || "/icons/192x192.png",
          body: data.body || "",
          data: {
            url: data.url || "/",
          },
          icon: data.icon || "/icons/192x192.png",
        };

        await self.registration.showNotification(title, options);
      } catch (error) {
        console.error("Service worker push error:", error);
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification && event.notification.data;
  const targetUrl = new URL(
    (notificationData && notificationData.url) || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      for (const client of allClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })()
  );
});
