/* eslint-disable @typescript-eslint/triple-slash-reference */
// eslint-disable-next-line spaced-comment
/// <reference path="../types/service-worker.d.ts" />
/* eslint-env serviceworker */
import { cacheNames, RouteHandler } from "workbox-core";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import {
  CacheFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";

const noFallBackRegEx =
  /\/(api|static|auth|frontend_latest|frontend_es5|local)\/.*/;

const initRouting = () => {
  precacheAndRoute(
    // @ts-ignore
    WB_MANIFEST,
    {
      // Ignore all URL parameters.
      ignoreURLParametersMatching: [/.*/],
    }
  );

  // Cache static content (including translations) on first access.
  registerRoute(
    /\/(static|frontend_latest|frontend_es5)\/.+/,
    new CacheFirst({ matchOptions: { ignoreSearch: true } })
  );

  // Cache any brand images used for 30 days
  // Use revalidation so cache is always available during an extended outage
  registerRoute(
    ({ url, request }) =>
      url.origin === "https://brands.home-assistant.io" &&
      request.destination === "image",
    new StaleWhileRevalidate({
      cacheName: "brands",
      // CORS must be forced to work for CSS images
      fetchOptions: { mode: "cors", credentials: "omit" },
      plugins: [
        // Add 404 so we quicly respond to domains with missing images
        new CacheableResponsePlugin({ statuses: [0, 200, 404] }),
        new ExpirationPlugin({
          maxAgeSeconds: 60 * 60 * 24 * 30,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // Get api from network.
  registerRoute(/\/(api|auth)\/.*/, new NetworkOnly());

  // Get manifest, service worker, onboarding from network.
  registerRoute(
    /\/(service_worker.js|manifest.json|onboarding.html)/,
    new NetworkOnly()
  );

  // For the root "/" we ignore search
  registerRoute(
    /\/(\?.*)?$/,
    new StaleWhileRevalidate({ matchOptions: { ignoreSearch: true } })
  );

  // For rest of the files (on Home Assistant domain only) try both cache and network.
  // This includes "/states" response and user files from "/local".
  // First access might bring stale data from cache, but a single refresh will bring updated
  // file.
  registerRoute(
    /\/.*/,
    new StaleWhileRevalidate({
      cacheName: "file-cache",
      plugins: [
        new ExpirationPlugin({
          maxAgeSeconds: 60 * 60 * 24,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );
};

const initPushNotifications = () => {
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

  self.addEventListener("push", (event) => {
    let data;
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
          .then((/* notification */) => {
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

  self.addEventListener("notificationclick", (event) => {
    notificationEventCallback("clicked", event);

    event.notification.close();

    if (
      event.action ||
      !event.notification.data ||
      !event.notification.data.url
    ) {
      return;
    }

    const url = event.notification.data.url;

    if (!url) return;

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
        })
        .then((windowClients) => {
          let i;
          let client;
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

  self.addEventListener("notificationclose", (event) => {
    notificationEventCallback("closed", event);
  });
};

const catchHandler: RouteHandler = async (options) => {
  const dest = (options.request as Request).destination;
  const url = (options.request as Request).url;

  if (dest !== "document" || noFallBackRegEx.test(url)) {
    return Response.error();
  }
  // eslint-disable-next-line no-console
  console.log("Using fallback for:", url);

  return (await caches.match("/", { ignoreSearch: true })) || Response.error();
};

self.addEventListener("install", (event) => {
  // Delete all runtime caching, so that index.html has to be refetched.
  // And add the new index.html back to the runtime cache
  const cacheName = cacheNames.runtime;
  event.waitUntil(
    caches.delete(cacheName).then(() =>
      caches.open(cacheName).then((cache) => {
        cache.add("/");
      })
    )
  );
});

self.addEventListener("activate", () => {
  // Attach the service worker to any page of the app
  // that didn't have a service worker loaded.
  // Happens the first time they open the app without any
  // service worker registered.
  // This will serve code splitted bundles from SW.
  clients.claim();
});

self.addEventListener("message", (message) => {
  if (message.data.type === "skipWaiting") {
    self.skipWaiting();
  }
});

cleanupOutdatedCaches();
initRouting();
setCatchHandler(catchHandler);
initPushNotifications();
