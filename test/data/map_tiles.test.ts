import type { Connection } from "home-assistant-js-websocket";
import { beforeEach, describe, expect, it, vi } from "vitest";

// MapLibre hands tile URLs to a worker, which has no document to resolve a
// relative URL against. Measured: without absolute URLs nothing loads at all -
// not the TileJSON, not the glyphs, not a tile - and MapLibre reports no error,
// so this is worth pinning down.

const connectionWith = (token: string) =>
  ({
    sendMessagePromise: vi.fn(async () => ({ token })),
  }) as unknown as Connection;

const load = async () => {
  vi.resetModules();
  return import("../../src/data/map_tiles");
};

describe("withMapTilesToken", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("makes relative URLs absolute", async () => {
    const { withMapTilesToken } = await load();

    expect(withMapTilesToken("/api/map_tiles/tilejson.json")).toBe(
      `${location.origin}/api/map_tiles/tilejson.json`
    );
  });

  it("adds the token to proxy URLs once there is one", async () => {
    const { ensureMapTilesToken, withMapTilesToken } = await load();
    await ensureMapTilesToken(connectionWith("abc123"));

    const url = new URL(withMapTilesToken("/api/map_tiles/vector/1/0/0.mvt"));
    expect(url.searchParams.get("token")).toBe("abc123");
    expect(url.pathname).toBe("/api/map_tiles/vector/1/0/0.mvt");
  });

  it("leaves anything outside the proxy alone", async () => {
    const { ensureMapTilesToken, withMapTilesToken } = await load();
    await ensureMapTilesToken(connectionWith("abc123"));

    const url = new URL(
      withMapTilesToken("https://example.com/tiles/1/0/0.png")
    );
    expect(url.searchParams.get("token")).toBeNull();
    expect(url.href).toBe("https://example.com/tiles/1/0/0.png");
  });

  it("still returns an absolute URL when there is no token", async () => {
    const { withMapTilesToken } = await load();

    expect(
      withMapTilesToken("/api/map_tiles/fonts/noto_sans_regular/0-255.pbf")
    ).toBe(
      `${location.origin}/api/map_tiles/fonts/noto_sans_regular/0-255.pbf`
    );
  });
});

describe("ensureMapTilesToken", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("asks the backend once and reuses the answer", async () => {
    const { ensureMapTilesToken } = await load();
    const connection = connectionWith("abc123");

    expect(await ensureMapTilesToken(connection)).toBe("abc123");
    expect(await ensureMapTilesToken(connection)).toBe("abc123");
    expect(connection.sendMessagePromise).toHaveBeenCalledTimes(1);
  });

  // A backend without the proxy must not hold the map hostage while the
  // retries run; the map falls back to loading nothing rather than to nothing
  // being drawn at all.
  it("gives up quickly on a backend that does not answer", async () => {
    const { ensureMapTilesToken } = await load();
    const connection = {
      sendMessagePromise: vi.fn(async () => {
        throw new Error("unknown command");
      }),
    } as unknown as Connection;

    const started = Date.now();
    expect(await ensureMapTilesToken(connection)).toBeUndefined();
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("tells subscribers when a token arrives, for Leaflet's baked template", async () => {
    const { ensureMapTilesToken, subscribeMapTilesToken } = await load();
    const listener = vi.fn();
    subscribeMapTilesToken(listener);

    await ensureMapTilesToken(connectionWith("abc123"));

    expect(listener).toHaveBeenCalledWith("abc123");
  });
});
