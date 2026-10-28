import type { WorkboxPlugin } from "workbox-core";

export const noFallBackRegEx =
  /\/(api|static|auth|frontend_latest|frontend_es5|local)\/.*/;

export const navigationCacheKey = (request: Request) => {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return url.href;
};

const rootCacheKey = (request: Request) => new URL("/", request.url).href;

// Core 404s panel paths until their integration loads and proxies 5xx during
// a restart; serve the cached shell so the app reconnects. Runs on preloaded
// responses too. A 404 for a /local/ file is real and passes through.
// Install seeds only the root, so a deep link that 404s, times out or fails
// before it was ever cached falls back to that shell.
export const createNavigationFallbackPlugin = (
  cacheName: string
): WorkboxPlugin => ({
  cacheKeyWillBeUsed: async ({ request }) => navigationCacheKey(request),
  cachedResponseWillBeUsed: async ({ request, cachedResponse }) => {
    if (cachedResponse || noFallBackRegEx.test(request.url)) {
      return cachedResponse;
    }
    return caches.match(rootCacheKey(request), { cacheName });
  },
  handlerWillRespond: async ({ request, response }) => {
    const noFallback = noFallBackRegEx.test(request.url);
    if (response.status < 500 && (response.status !== 404 || noFallback)) {
      return response;
    }
    const cached = await caches.match(navigationCacheKey(request), {
      cacheName,
    });
    if (cached || noFallback) {
      return cached ?? response;
    }
    return (
      (await caches.match(rootCacheKey(request), { cacheName })) ?? response
    );
  },
});
