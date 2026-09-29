// WorkHop Hyperlocal Service Worker - Web Push & Background Notifications
const CACHE_NAME = "workhop-cache-v1";
const OFFLINE_URLS = ["/", "/favicon.svg", "/workhop-logo.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch(() => {});
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((k) => {
            if (k !== CACHE_NAME) return caches.delete(k);
          })
        );
      }),
    ])
  );
});

// ══════════════ Web Push Notification Receiver ══════════════
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = {
        title: "WorkHop Alert",
        body: event.data.text() || "New gig alert available near you!",
      };
    }
  }

  const title = data.title || "⚡ WorkHop Freelancer Alert";
  const options = {
    body: data.body || "A new high-paying gig or message arrived on WorkHop.",
    icon: data.icon || "/favicon.svg",
    badge: data.badge || "/favicon.svg",
    tag: data.tag || `workhop-push-${Date.now()}`,
    data: {
      url: data.url || "/freelancer/jobs",
      timestamp: Date.now(),
      ...data,
    },
    vibrate: [200, 100, 200, 100, 200],
    renotify: true,
    requireInteraction: Boolean(data.requireInteraction ?? false),
    actions: data.actions || [
      { action: "open", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ══════════════ Notification Click Handler ══════════════
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || "/freelancer/jobs";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 1. If an existing WorkHop tab is open, focus it and navigate
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url && client.url.includes(self.registration.scope)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // 2. Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
