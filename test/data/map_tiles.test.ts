import type { Connection } from "home-assistant-js-websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// MapLibre hands tile URLs to a worker, which has no document to resolve a
// relative URL against. Measured: without absolute URLs nothing loads at all -
// not the TileJSON, not the glyphs, not a tile - and MapLibre reports no error,
// so this is worth pinning down.

// Cast connects to an instance on another host, so the proxy is not on the
// origin serving the page; everywhere else the two are the same.
const connectionWith = (
  { hassUrl }: { hassUrl?: string } = {},
  ...tokens: string[]
) => {
  let call = 0;
  const listeners: Record<string, () => void> = {};
  return {
    options: { auth: { data: { hassUrl: hassUrl ?? location.origin } } },
    sendMessagePromise: vi.fn(async () => ({
      token: tokens[Math.min(call++, tokens.length - 1)],
    })),
    addEventListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] = cb;
    }),
    removeEventListener: vi.fn(),
    listeners,
  } as unknown as Connection & { listeners: Record<string, () => void> };
};

// Mirrors BLOCKING_DELAYS_MS, which is not exported.
const BLOCKING_ATTEMPTS = 3;

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
    await ensureMapTilesToken(connectionWith({}, "abc123"));

    const url = new URL(withMapTilesToken("/api/map_tiles/vector/1/0/0.mvt"));
    expect(url.searchParams.get("token")).toBe("abc123");
    expect(url.pathname).toBe("/api/map_tiles/vector/1/0/0.mvt");
  });

  it("leaves anything outside the proxy alone", async () => {
    const { ensureMapTilesToken, withMapTilesToken } = await load();
    await ensureMapTilesToken(connectionWith({}, "abc123"));

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
    const connection = connectionWith({}, "abc123");

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
      options: { auth: { data: { hassUrl: location.origin } } },
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

    await ensureMapTilesToken(connectionWith({}, "abc123"));

    expect(listener).toHaveBeenCalledWith("abc123");
  });
});

// A token can expire before the refresh interval comes round, so recovery
// hangs on the reconnect and on retrying a refused request.
describe("recovering a stale token", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("fetches a new token when the connection comes back", async () => {
    const { ensureMapTilesToken, subscribeMapTilesToken } = await load();
    const connection = connectionWith({}, "first", "second") as Connection & {
      listeners: Record<string, () => void>;
    };
    await ensureMapTilesToken(connection);

    const listener = vi.fn();
    subscribeMapTilesToken(listener);
    connection.listeners.ready();
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith("second"));
  });

  it("asks once for a refresh however many tiles were refused", async () => {
    const { ensureMapTilesToken, refreshMapTilesToken } = await load();
    const connection = connectionWith({}, "first", "second");
    await ensureMapTilesToken(connection);
    expect(connection.sendMessagePromise).toHaveBeenCalledTimes(1);

    await Promise.all([
      refreshMapTilesToken(),
      refreshMapTilesToken(),
      refreshMapTilesToken(),
    ]);

    expect(connection.sendMessagePromise).toHaveBeenCalledTimes(2);
  });

  it("keeps the old token when the refresh fails", async () => {
    const { ensureMapTilesToken, refreshMapTilesToken, withMapTilesToken } =
      await load();
    const connection = connectionWith({}, "first");
    await ensureMapTilesToken(connection);

    vi.mocked(connection.sendMessagePromise).mockRejectedValueOnce(
      new Error("disconnected")
    );
    await refreshMapTilesToken();

    expect(
      new URL(
        withMapTilesToken("/api/map_tiles/vector/1/0/0.mvt")
      ).searchParams.get("token")
    ).toBe("first");
  });
});

describe("asking for a token once", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares one attempt across every map on the dashboard", async () => {
    const { ensureMapTilesToken } = await load();
    const connection = connectionWith({}, "abc123");

    await Promise.all([
      ensureMapTilesToken(connection),
      ensureMapTilesToken(connection),
      ensureMapTilesToken(connection),
    ]);

    expect(connection.sendMessagePromise).toHaveBeenCalledTimes(1);
  });

  // Without sharing, a backend that has no proxy yet gets every retry of every
  // map: three blocking and four background attempts each.
  it("shares the retries too when the backend does not answer", async () => {
    const { ensureMapTilesToken } = await load();
    const connection = {
      options: { auth: { data: { hassUrl: location.origin } } },
      sendMessagePromise: vi.fn(async () => {
        throw new Error("unknown command");
      }),
      addEventListener: vi.fn(),
    } as unknown as Connection;

    await Promise.all([
      ensureMapTilesToken(connection),
      ensureMapTilesToken(connection),
      ensureMapTilesToken(connection),
    ]);

    expect(connection.sendMessagePromise).toHaveBeenCalledTimes(
      BLOCKING_ATTEMPTS
    );
  });

  it("does not ask at all in the demo, which has no proxy", async () => {
    vi.stubGlobal("__DEMO__", true);
    const { ensureMapTilesToken } = await load();
    const connection = connectionWith({}, "abc123");

    expect(await ensureMapTilesToken(connection)).toBeUndefined();
    expect(connection.sendMessagePromise).not.toHaveBeenCalled();
  });
});

// Cast serves the frontend from its own host and connects to an instance
// elsewhere, so the proxy is not on the origin this page came from.
describe("resolving against the instance", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("points proxy URLs at the instance, not at this page", async () => {
    const { ensureMapTilesToken, withMapTilesToken } = await load();
    await ensureMapTilesToken(
      connectionWith({ hassUrl: "https://instance.local:8123" }, "abc123")
    );

    const url = new URL(withMapTilesToken("/api/map_tiles/tilejson.json"));
    expect(url.origin).toBe("https://instance.local:8123");
    expect(url.searchParams.get("token")).toBe("abc123");
  });

  // MapLibre resolves the style's paths against the document before handing
  // them over, so by then they carry the wrong host.
  it("moves a URL already resolved against this page", async () => {
    const { ensureMapTilesToken, withMapTilesToken } = await load();
    await ensureMapTilesToken(
      connectionWith({ hassUrl: "https://instance.local:8123" }, "abc123")
    );

    expect(
      new URL(
        withMapTilesToken(`${location.origin}/api/map_tiles/vector/1/0/0.mvt`)
      ).origin
    ).toBe("https://instance.local:8123");
  });

  it("keeps template placeholders intact", async () => {
    const { ensureMapTilesToken, mapTilesUrl } = await load();
    await ensureMapTilesToken(
      connectionWith({ hassUrl: "https://instance.local:8123" }, "abc123")
    );

    expect(mapTilesUrl("/api/map_tiles/raster/{z}/{x}/{y}.png")).toBe(
      "https://instance.local:8123/api/map_tiles/raster/{z}/{x}/{y}.png"
    );
  });
});

// Cast builds a fresh connection per connect message while this module lives
// on, so anything holding the first one stops working after a reconnect.
describe("following the current connection", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes over the newest connection", async () => {
    const { ensureMapTilesToken } = await load();
    const first = connectionWith({}, "abc123");
    const second = connectionWith({}, "def456");

    await ensureMapTilesToken(first);
    await ensureMapTilesToken(second);
    vi.mocked(first.sendMessagePromise).mockClear();

    await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

    expect(second.sendMessagePromise).toHaveBeenCalled();
    expect(first.sendMessagePromise).not.toHaveBeenCalled();
  });

  it("moves the reconnect listener to it", async () => {
    const { ensureMapTilesToken } = await load();
    const first = connectionWith({}, "abc123");
    const second = connectionWith({}, "def456");

    await ensureMapTilesToken(first);
    await ensureMapTilesToken(second);

    expect(first.removeEventListener).toHaveBeenCalledWith(
      "ready",
      expect.any(Function)
    );
    expect(second.addEventListener).toHaveBeenCalledWith(
      "ready",
      expect.any(Function)
    );
  });

  // Every attempt failing left no interval behind, so a token that only
  // arrived on the reconnect was never refreshed again.
  it("starts refreshing a token that first arrived on a reconnect", async () => {
    const { ensureMapTilesToken } = await load();
    let answer = false;
    const listeners: Record<string, () => void> = {};
    const connection = {
      options: { auth: { data: { hassUrl: location.origin } } },
      sendMessagePromise: vi.fn(async () => {
        if (!answer) {
          throw new Error("unknown command");
        }
        return { token: "abc123" };
      }),
      addEventListener: vi.fn((event: string, cb: () => void) => {
        listeners[event] = cb;
      }),
      removeEventListener: vi.fn(),
    } as unknown as Connection;

    const pending = ensureMapTilesToken(connection);
    await vi.advanceTimersByTimeAsync(40000);
    expect(await pending).toBeUndefined();

    answer = true;
    listeners.ready();
    await vi.waitFor(() => expect(connection.sendMessagePromise).toBeCalled());
    vi.mocked(connection.sendMessagePromise).mockClear();

    await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

    expect(connection.sendMessagePromise).toHaveBeenCalled();
  });
});
