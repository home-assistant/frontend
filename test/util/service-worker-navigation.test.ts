import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkboxPlugin } from "workbox-core";
import {
  createNavigationFallbackPlugin,
  navigationCacheKey,
} from "../../src/util/service-worker-navigation";

type RespondParam = Parameters<
  NonNullable<WorkboxPlugin["handlerWillRespond"]>
>[0];
type KeyParam = Parameters<NonNullable<WorkboxPlugin["cacheKeyWillBeUsed"]>>[0];
type CachedParam = Parameters<
  NonNullable<WorkboxPlugin["cachedResponseWillBeUsed"]>
>[0];

const CACHE_NAME = "navigation-cache";
const ORIGIN = "https://ha.example";

describe("service-worker-navigation", () => {
  let store: Map<string, Response>;
  let match: ReturnType<typeof vi.fn>;
  let plugin: WorkboxPlugin;

  const respond = (path: string, status: number) =>
    plugin.handlerWillRespond!({
      request: new Request(`${ORIGIN}${path}`),
      response: new Response(null, { status }),
    } as RespondParam);

  const cacheMatch = (path: string) =>
    plugin.cachedResponseWillBeUsed!({
      request: new Request(`${ORIGIN}${path}`),
      cachedResponse: store.get(`${ORIGIN}${path}`) ?? null,
    } as CachedParam);

  beforeEach(() => {
    store = new Map();
    match = vi.fn(async (key: string, options?: { cacheName?: string }) =>
      options?.cacheName === CACHE_NAME ? store.get(key) : undefined
    );
    vi.stubGlobal("caches", { match });
    plugin = createNavigationFallbackPlugin(CACHE_NAME);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keys the cache by path without query or hash", async () => {
    const request = new Request(`${ORIGIN}/lovelace/0?edit=1#top`);

    expect(navigationCacheKey(request)).toBe(`${ORIGIN}/lovelace/0`);
    await expect(
      plugin.cacheKeyWillBeUsed!({ request, mode: "write" } as KeyParam)
    ).resolves.toBe(`${ORIGIN}/lovelace/0`);
  });

  it("passes a successful response through without touching the cache", async () => {
    const response = await respond("/history", 200);

    expect(response.status).toBe(200);
    expect(match).not.toHaveBeenCalled();
  });

  it("serves the cached copy of the path on a 5xx, ignoring the query", async () => {
    const shell = new Response("history");
    store.set(`${ORIGIN}/history`, shell);

    await expect(respond("/history?range=1d", 502)).resolves.toBe(shell);
  });

  it("falls back to the cached root shell on a 5xx for an uncached path", async () => {
    const shell = new Response("root");
    store.set(`${ORIGIN}/`, shell);

    await expect(respond("/config/devices", 503)).resolves.toBe(shell);
  });

  it("does not serve the root shell for paths that have no fallback", async () => {
    store.set(`${ORIGIN}/`, new Response("root"));

    const response = await respond("/api/hassio/app/index.html", 502);

    expect(response.status).toBe(502);
  });

  it("returns the 5xx when nothing is cached", async () => {
    const response = await respond("/history", 500);

    expect(response.status).toBe(500);
  });

  it("serves the cached copy of the path on a 404", async () => {
    const shell = new Response("history");
    store.set(`${ORIGIN}/history`, shell);
    store.set(`${ORIGIN}/`, new Response("root"));

    await expect(respond("/history", 404)).resolves.toBe(shell);
  });

  it("returns the 404 for a path that has no fallback even when cached", async () => {
    store.set(`${ORIGIN}/local/page.html`, new Response("old page"));

    const response = await respond("/local/page.html", 404);

    expect(response.status).toBe(404);
    expect(match).not.toHaveBeenCalled();
  });

  it("serves the cached copy of a path that has no fallback on a 5xx", async () => {
    const page = new Response("page");
    store.set(`${ORIGIN}/local/page.html`, page);

    await expect(respond("/local/page.html", 502)).resolves.toBe(page);
  });

  it("serves the cached root shell when a deep link misses the cache", async () => {
    const shell = new Response("root");
    store.set(`${ORIGIN}/`, shell);

    await expect(cacheMatch("/config/devices")).resolves.toBe(shell);
  });

  it("keeps the cached copy of the path over the root shell", async () => {
    const page = new Response("history");
    store.set(`${ORIGIN}/history`, page);
    store.set(`${ORIGIN}/`, new Response("root"));

    await expect(cacheMatch("/history")).resolves.toBe(page);
  });

  it("does not use the root shell for a cache miss on a path that has no fallback", async () => {
    store.set(`${ORIGIN}/`, new Response("root"));

    await expect(cacheMatch("/local/page.html")).resolves.toBeNull();
    expect(match).not.toHaveBeenCalled();
  });

  it("falls back to the cached root shell on a 404 for an uncached path", async () => {
    const shell = new Response("root");
    store.set(`${ORIGIN}/`, shell);

    await expect(respond("/config/devices", 404)).resolves.toBe(shell);
  });

  it("returns the 404 when nothing is cached", async () => {
    const response = await respond("/config/devices", 404);

    expect(response.status).toBe(404);
  });
});
