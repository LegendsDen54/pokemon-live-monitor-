// Pokémon Live Monitor Service Worker

const CACHE_NAME = "pokemon-live-monitor-v2";

const APP_SHELL = [
  "./",
  "./index.html"
];


// ========================================
// INSTALL
// ========================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );

  self.skipWaiting();
});


// ========================================
// ACTIVATE
// ========================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});


// ========================================
// NORMAL APP REQUESTS
// ========================================

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();

        caches
          .open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, copy);
          })
          .catch(() => {});

        return response;
      })
      .catch(() =>
        caches.match(event.request)
      )
  );
});


// ========================================
// BACKGROUND WEB PUSH
// ========================================

self.addEventListener("push", (event) => {
  let data = {};

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    data = {
      body: event.data
        ? event.data.text()
        : "New Pokémon restock update."
    };
  }

  const title =
    data.title ||
    "Pokémon Restock Monitor";

  const options = {
    body:
      data.body ||
      "A Pokémon product may be back in stock.",

    icon:
      data.icon ||
      "./restock_background.png",

    badge:
      data.badge ||
      "./restock_background.png",

    tag:
      data.tag ||
      "pokemon-restock",

    renotify: true,

    requireInteraction: true,

    data: {
      url:
        data.url ||
        "https://pokemon-live-monitor.onrender.com/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});


// ========================================
// NOTIFICATION CLICK
// ========================================

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification.data?.url ||
      "https://pokemon-live-monitor.onrender.com/";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then((clientList) => {

          for (const client of clientList) {
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }

            if ("focus" in client) {
              return client.focus();
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(
              targetUrl
            );
          }
        })
    );
  }
);