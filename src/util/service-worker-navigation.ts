import type { WorkboxPlugin } from "workbox-core";

export const noFallBackRegEx =
  /\/(api|static|auth|frontend_latest|frontend_es5|local)\/.*/;

export const navigationCacheKey = (request: Request) => {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return url.href;
};

// Core 404s panel paths until their integration loads and proxies 5xx during
// a restart; serve the cached shell so the app reconnects. Runs on preloaded
// responses too. A 404 for a /local/ file is real and passes through.
export const createNavigationFallbackPlugin = (
  cacheName: string
): WorkboxPlugin => ({
  cacheKeyWillBeUsed: async ({ request }) => navigationCacheKey(request),
  handlerWillRespond: async ({ request, response }) => {
    const noFallback = noFallBackRegEx.test(request.url);
    if (response.status < 500 && (response.status !== 404 || noFallback)) {
      return response;
    }
    const cached = await caches.match(navigationCacheKey(request), {
      cacheName,
    });
    if (cached || response.status === 404 || noFallback) {
      return cached ?? response;
    }
    return (
      (await caches.match(new URL("/", request.url).href, { cacheName })) ??
      response
    );
  },
});
