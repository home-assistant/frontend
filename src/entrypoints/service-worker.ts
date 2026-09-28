/* eslint-disable @typescript-eslint/triple-slash-reference */

/// <reference path="../types/service-worker.d.ts" />
import type { RouteHandler } from "workbox-core";
import { cacheNames } from "workbox-core";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import {
  CacheFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";

// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __WB_MANIFEST__: Parameters<typeof precacheAndRoute>[0];

const noFallBackRegEx =
  /\/(api|static|auth|frontend_latest|frontend_es5|local)\/.*/;

// Camera / image proxy endpoints that carry credentials in the URL.
// We pre-validate the credential in the service worker so obviously invalid
// requests (signature expired, token missing) never reach the server and
// don't trigger spurious "Login attempt" warnings from http.ban after BFCache
// restore, tab resume, network change, or any other browser-initiated replay
// of a stale `<img>` URL.
const proxyPathRegEx =
  /^\/api\/(camera_proxy_stream|camera_proxy|image_proxy)\//;

// Reject signatures this many ms before their nominal expiry to absorb small
// client/server clock differences. Erring this direction only ever turns a
// would-be valid request into a local 401; we cannot err the other way without
// re-introducing the warnings this filter exists to prevent.
const JWT_EXPIRY_SKEW_MS = 5000;

const base64UrlDecode = (input: string): string => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
};

const isJwtExpired = (jwt: string): boolean => {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) {
      return false;
    }
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (typeof payload.exp !== "number") {
      return false;
    }
    return payload.exp * 1000 < Date.now() + JWT_EXPIRY_SKEW_MS;
  } catch (_err) {
    // If we can't parse the JWT for any reason, defer to the server.
    return false;
  }
};

const handleProxyRequest: RouteHandler = async ({ request }) => {
  const req = request as Request;
  const url = new URL(req.url);

  const token = url.searchParams.get("token");
  if (token === "undefined" || token === "null" || token === "") {
    return new Response(null, { status: 401, statusText: "Invalid token" });
  }

  const authSig = url.searchParams.get("authSig");
  if (authSig && isJwtExpired(authSig)) {
    return new Response(null, {
      status: 401,
      statusText: "Signature expired",
    });
  }

  return fetch(req);
};

const initRouting = () => {
  precacheAndRoute(__WB_MANIFEST__, {
    // Ignore all URL parameters.
    ignoreURLParametersMatching: [/.*/],
  });

  // Cache static content (including translations) on first access.
  registerRoute(
    /\/(static|frontend_latest|frontend_es5)\/.+/,
    new CacheFirst({ matchOptions: { ignoreSearch: true } })
  );

  // Cache any brand images used for 1 day
  // Brands are proxied via the local API with backend caching.
  // Strip the rotating access token from cache keys so token rotation
  // doesn't bust the cache, while preserving other params like "placeholder".
  registerRoute(
    ({ url, request }) =>
      url.pathname.startsWith("/api/brands/") &&
      request.destination === "image",
    new StaleWhileRevalidate({
      cacheName: "brands",
      plugins: [
        {
          cacheKeyWillBeUsed: async ({ request }) => {
            const url = new URL(request.url);
            url.searchParams.delete("token");
            return url.href;
          },
        },
        // Add 404 so we quickly respond to domains with missing images
        new CacheableResponsePlugin({ statuses: [0, 200, 404] }),
        new ExpirationPlugin({
          maxAgeSeconds: 60 * 60 * 24,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // Strip the rotating token from the cache key, or every rotation refetches
  // every tile. The TileJSON is deliberately not matched: it is the switching
  // point for the tile source, so it stays on the network.
  registerRoute(
    ({ url }) =>
      /^\/api\/map_tiles\/(vector|raster|fonts|sprites)\//.test(url.pathname),
    new CacheFirst({
      cacheName: "map-tiles",
      plugins: [
        {
          cacheKeyWillBeUsed: async ({ request }) => {
            const url = new URL(request.url);
            url.searchParams.delete("token");
            return url.href;
          },
        },
        // A stale token gives a 403; caching that would pin the failure.
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 7,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // Short-circuit camera/image proxy requests with an expired signature or a
  // missing/undefined token so they don't hit core and get logged as invalid
  // login attempts. Registered before the generic /api route below so it wins.
  registerRoute(
    ({ url, request }) =>
      proxyPathRegEx.test(url.pathname) && request.method === "GET",
    handleProxyRequest
  );

  // Get api from network.
  registerRoute(/\/(api|auth)\/.*/, new NetworkOnly());

  // Get manifest and onboarding from network.
  registerRoute(/\/(?:manifest\.json|onboarding\.html)/, new NetworkOnly());

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
        self.registration.showNotification(data.title, data).then((
          /* notification */
        ) => {
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
  // This will serve code split bundles from SW.
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
