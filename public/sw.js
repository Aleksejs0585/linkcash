const CACHE = "linkcash-v1";
const STATIC = [
  "/",
  "/offline",
  "/linkcash-icon-512.png",
  "/manifest.webmanifest",
];

// Install: cache key static assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static assets, network-first for everything else
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always network for API routes
  if (url.pathname.startsWith("/api/")) return;

  // Cache-first for Next.js static assets (content-hashed, safe to cache forever)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/linkcash-icon")) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached ?? fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Network-first for HTML pages, fallback to offline page
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match("/offline") ?? new Response("Offline", { status: 503 })
      )
    );
    return;
  }
});

// Push: show notification
self.addEventListener("push", (e) => {
  if (!e.data) return;

  let data = { title: "LinkCash", body: "You have a new notification.", url: "/wallet", icon: "/linkcash-icon-512.png" };
  try { data = { ...data, ...e.data.json() }; } catch { /* use defaults */ }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.icon,
      data: { url: data.url },
      vibrate: [100, 50, 100],
    })
  );
});

// Notification click: open URL
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
