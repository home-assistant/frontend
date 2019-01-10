/* global workbox clients */

function initRouting() {
  workbox.precaching.precacheAndRoute(self.__precacheManifest || []);

  // Cache static content (including translations) on first access.
  workbox.routing.registerRoute(
    new RegExp(`${location.host}/(static|frontend_latest|frontend_es5)/.+`),
    workbox.strategies.cacheFirst()
  );

  // Get api from network.
  workbox.routing.registerRoute(
    new RegExp(`${location.host}/api/.*`),
    workbox.strategies.networkOnly()
  );

  // Get manifest and service worker from network.
  workbox.routing.registerRoute(
    new RegExp(
      `${location.host}/(service_worker.js|service_worker_es5.js|manifest.json)`
    ),
    workbox.strategies.networkOnly()
  );

  // For rest of the files (on Home Assistant domain only) try both cache and network.
  // This includes the root "/" or "/states" response and user files from "/local".
  // First access might bring stale data from cache, but a single refresh will bring updated
  // file.
  workbox.routing.registerRoute(
    new RegExp(`${location.host}/.*`),
    workbox.strategies.staleWhileRevalidate()
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
            .then(function(notifications) {
              for (const n of notifications) {
                n.close();
              }
            })
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

    if (!event.notification.data || !event.notification.data.url) {
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

self.addEventListener("message", (message) => {
  if (message.data.type === "skipWaiting") {
    self.skipWaiting();
    clients.claim();
  }
});

workbox.setConfig({
  debug: __DEV__,
});

if (!__DEV__) {
  initRouting();
}

initPushNotifications();
