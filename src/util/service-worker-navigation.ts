import type { WorkboxPlugin } from "workbox-core";

export const noFallBackRegEx =
  /\/(api|static|auth|frontend_latest|frontend_es5|local)\/.*/;

export const navigationCacheKey = (request: Request) => {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return url.href;
};

// Core serves the index for "/" and registered panel paths only, and it
// starts serving before every integration has registered its panel, so a
// reload on a panel path during startup gets a 404. A reverse proxy or the
// cloud answers 5xx while core restarts. Both get the cached shell so the app
// reconnects on its own. Runs on the final response, so it also covers
// preloaded navigations.
export const createNavigationFallbackPlugin = (
  cacheName: string
): WorkboxPlugin => ({
  cacheKeyWillBeUsed: async ({ request }) => navigationCacheKey(request),
  handlerWillRespond: async ({ request, response }) => {
    if (response.status !== 404 && response.status < 500) {
      return response;
    }
    const cached = await caches.match(navigationCacheKey(request), {
      cacheName,
    });
    if (
      cached ||
      response.status === 404 ||
      noFallBackRegEx.test(request.url)
    ) {
      return cached ?? response;
    }
    return (
      (await caches.match(new URL("/", request.url).href, { cacheName })) ??
      response
    );
  },
});
