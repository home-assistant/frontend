/*
  This file is not run through webpack, but instead is directly manipulated
  by Workbox Webpack plugin. So we cannot use __DEV__ or other constants.
*/
/* global workbox clients */

function initRouting() {
  workbox.precaching.precacheAndRoute(self.__precacheManifest || []);

  // Cache static content (including translations) on first access.
  workbox.routing.registerRoute(
    new RegExp(`${location.host}/(static|frontend_latest|frontend_es5)/.+`),
    new workbox.strategies.CacheFirst()
  );

  // Get api from network.
  workbox.routing.registerRoute(
    new RegExp(`${location.host}/(api|auth)/.*`),
    new workbox.strategies.NetworkOnly()
  );

  // Get manifest, service worker, onboarding from network.
  workbox.routing.registerRoute(
    new RegExp(
      `${location.host}/(service_worker.js|manifest.json|onboarding.html)`
    ),
    new workbox.strategies.NetworkOnly()
  );

  // For rest of the files (on Home Assistant domain only) try both cache and network.
  // This includes the root "/" or "/states" response and user files from "/local".
  // First access might bring stale data from cache, but a single refresh will bring updated
  // file.
  workbox.routing.registerRoute(
    new RegExp(`${location.host}/.*`),
    new workbox.strategies.StaleWhileRevalidate()
  );
}

function initPushNotifications() {
  // HTML5 Push Notifications
  function firePushCallback(payload, jwt) {
    // Don't send the JWT in the payload.data
    delete payload.data.jwt;
    // If payload.data is empty then just remove the entire payload.data object.
    if (
      Object.keys(payload.data).length === 0 &&
      payload.data.constructor === Object
    ) {
      delete payload.data;
    }
    fetch("/api/notify.html5/callback", {
      credentials: "same-origin",
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        Authorization: "Bearer " + jwt,
      }),
      body: JSON.stringify(payload),
    });
  }

  function notificationEventCallback(eventType, event) {
    firePushCallback(
      {
        action: event.action,
        data: event.notification.data,
        tag: event.notification.tag,
        type: eventType,
      },
      event.notification.data.jwt
    );
  }

  self.addEventListener("push", function(event) {
    var data;
    if (event.data) {
      data = event.data.json();
      if (data.dismiss) {
        event.waitUntil(
          self.registration
            .getNotifications({ tag: data.tag })
            .then((notifications) => notifications.forEach((n) => n.close()))
        );
        return;
      }
      event.waitUntil(
        self.registration
          .showNotification(data.title, data)
          .then(function(/* notification */) {
            firePushCallback(
              {
                type: "received",
                tag: data.tag,
                data: data.data,
              },
              data.data.jwt
            );
          })
      );
    }
  });

  self.addEventListener("notificationclick", function(event) {
    var url;

    notificationEventCallback("clicked", event);

    event.notification.close();

    if (
      event.action ||
      !event.notification.data ||
      !event.notification.data.url
    ) {
      return;
    }

    url = event.notification.data.url;

    if (!url) return;

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
        })
        .then(function(windowClients) {
          var i;
          var client;
          for (i = 0; i < windowClients.length; i++) {
            client = windowClients[i];
            if (client.url === url && "focus" in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
          return undefined;
        })
    );
  });

  self.addEventListener("notificationclose", function(event) {
    notificationEventCallback("closed", event);
  });
}

self.addEventListener("install", (event) => {
  // Delete all runtime caching, so that index.html has to be refetched.
  const cacheName = workbox.core.cacheNames.runtime;
  event.waitUntil(caches.delete(cacheName));
});

self.addEventListener("message", (message) => {
  if (message.data.type === "skipWaiting") {
    self.skipWaiting();
    clients.claim();
  }
});

workbox.setConfig({
  debug: false,
});

initRouting();
initPushNotifications();
