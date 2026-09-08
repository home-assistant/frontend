import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeafletModuleType } from "../../../src/common/dom/setup-leaflet-map";

// The fallback to raster tiles is what keeps the map working on devices
// without WebGL2, on instances that cannot load the MapLibre chunk, and when
// building the MapLibre map itself fails - a blocked worker, an exhausted
// WebGL context budget. None of that is reachable from the `ha-map` tests,
// which run in jsdom and therefore only ever take the raster branch.

const maplibreLayer = vi.hoisted(() => ({
  addTo: vi.fn(),
  remove: vi.fn(),
  options: {} as { attribution?: string },
  getMaplibreMap: vi.fn(),
}));

const maplibreGL = vi.hoisted(() => vi.fn(() => maplibreLayer));

vi.mock("@maplibre/maplibre-gl-leaflet", () => ({ maplibreGL }));

// The token module is driven directly here, so a stale token and the one that
// replaces it can be played out without a WebSocket.
// Stands in for the instance the proxy runs on, which on Cast is not the host
// serving the page.
const INSTANCE_URL = vi.hoisted(() => "https://instance.local");
const tokenListeners = vi.hoisted(() => new Set<(token: string) => void>());
const refreshMapTilesToken = vi.hoisted(() => vi.fn());
vi.mock("../../../src/data/map_tiles", () => ({
  MAP_TILES_PATH: "/api/map_tiles",
  mapTilesUrl: (path: string) => `${INSTANCE_URL}${path}`,
  refreshMapTilesToken,
  subscribeMapTilesToken: (listener: (token: string) => void) => {
    tokenListeners.add(listener);
    return () => tokenListeners.delete(listener);
  },
  withMapTilesToken: (url: string) => new URL(url, location.href).href,
}));
const emitToken = (token: string) =>
  tokenListeners.forEach((listener) => listener(token));

const setRTLTextPlugin = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("maplibre-gl", () => ({ setRTLTextPlugin }));

const STYLE = {
  version: 8,
  sources: {},
  layers: [],
  sprite: [{ id: "basics", url: "/static/map/sprites/basics/sprites" }],
};

const rasterLayer = {
  // Leaflet returns the layer from addTo, and the source chains off it.
  addTo: vi.fn(() => rasterLayer),
  redraw: vi.fn(),
  options: {} as Record<string, unknown>,
};
const leaflet = {
  tileLayer: vi.fn(() => rasterLayer),
} as unknown as LeafletModuleType;

const TOKEN = "test-token";

// `createVectorLayer` listens on both the MapLibre map and the Leaflet map.
const glHandlers: Record<string, (event?: unknown) => void> = {};
const glMap = {
  setStyle: vi.fn(),
  on: vi.fn((event: string, handler: (event?: unknown) => void) => {
    glHandlers[event] = handler;
  }),
};
const map = { on: vi.fn() } as any;

// The WebGL2 probe is cached for the lifetime of the module, so every test
// needs its own copy of it.
const setWebGL2 = async (supported: boolean) => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() =>
    supported ? ({ getExtension: () => null } as any) : null
  );
  return (await import("../../../src/common/map/base-layer")).createBaseLayer;
};

const isRaster = () => vi.mocked(leaflet.tileLayer).mock.calls.length === 1;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  tokenListeners.clear();
  maplibreLayer.options = {};
  maplibreGL.mockReturnValue(maplibreLayer);
  maplibreLayer.addTo.mockImplementation(() => maplibreLayer);
  maplibreLayer.getMaplibreMap.mockReturnValue(glMap);
  for (const event of Object.keys(glHandlers)) {
    delete glHandlers[event];
  }
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => structuredClone(STYLE) }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createBaseLayer", () => {
  it("falls back to raster tiles without WebGL2", async () => {
    const createBaseLayer = await setWebGL2(false);

    await createBaseLayer(leaflet, map, false, TOKEN);

    expect(isRaster()).toBe(true);
    expect(maplibreGL).not.toHaveBeenCalled();
    expect(rasterLayer.addTo).toHaveBeenCalledWith(map);
    const [url, options = {}] = vi.mocked(leaflet.tileLayer).mock.calls[0];
    // Through core's proxy, which is what identifies Home Assistant upstream -
    // a browser can set neither a User-Agent nor a Referer.
    // Absolute, because on Cast this page is not served by the instance.
    expect(url).toBe(
      `${INSTANCE_URL}/api/map_tiles/raster/{z}/{x}/{y}.png?token={token}`
    );
    // Leaflet substitutes options into the template on every tile request, so
    // the token can be refreshed without recreating the layer.
    expect(url).toContain("token={token}");
    expect(options).toMatchObject({ token: TOKEN });
    // OSM serves no raster past 19, so the last level is scaled up instead.
    expect(options.maxNativeZoom).toBe(19);
    expect(options.maxZoom).toBeGreaterThan(19);
    // The vector layer takes its credit from the style's source instead, so the
    // raster layer is the only one carrying attribution itself.
    expect(options.attribution).toContain("openstreetmap.org/copyright");
  });

  // The demo ships without a backend, so there is no proxy to fall back to.
  it("falls back to upstream raster in the demo, with a referrer", async () => {
    vi.stubGlobal("__DEMO__", true);
    const createBaseLayer = await setWebGL2(false);
    await createBaseLayer(leaflet, map, false, undefined);

    const [url, options = {}] = vi.mocked(leaflet.tileLayer).mock.calls[0];
    expect(url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    // OSM refuses a browser that sends neither, and the demo page's meta
    // policy strips the referrer unless the tiles ask for it back.
    expect(options.referrerPolicy).toBe("origin");
  });

  it("registers the RTL text plugin once, lazily, from our own host", async () => {
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);
    await createBaseLayer(leaflet, map, false, TOKEN);

    expect(setRTLTextPlugin).toHaveBeenCalledOnce();
    expect(setRTLTextPlugin).toHaveBeenCalledWith(
      `${location.origin}/static/map/mapbox-gl-rtl-text.js`,
      true
    );
  });

  it("uses vector tiles when WebGL2 is available", async () => {
    const createBaseLayer = await setWebGL2(true);

    await createBaseLayer(leaflet, map, false, TOKEN);

    expect(maplibreGL).toHaveBeenCalledOnce();
    expect(maplibreLayer.addTo).toHaveBeenCalledWith(map);
    expect(leaflet.tileLayer).not.toHaveBeenCalled();
  });

  it("falls back to raster tiles when the style cannot be fetched", async () => {
    const createBaseLayer = await setWebGL2(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );

    await createBaseLayer(leaflet, map, false, TOKEN);

    expect(isRaster()).toBe(true);
  });

  // The plugin only builds the MapLibre map once the layer is added, so this
  // is where a blocked worker or a refused WebGL context surfaces.
  it("falls back to raster tiles when adding the vector layer throws", async () => {
    const createBaseLayer = await setWebGL2(true);
    maplibreLayer.addTo.mockImplementation(() => {
      throw new Error("Failed to initialize WebGL");
    });

    await createBaseLayer(leaflet, map, false, TOKEN);

    expect(isRaster()).toBe(true);
    expect(maplibreLayer.remove).toHaveBeenCalled();
  });

  it("still falls back when tearing down the half-added layer throws", async () => {
    const createBaseLayer = await setWebGL2(true);
    maplibreLayer.addTo.mockImplementation(() => {
      throw new Error("Failed to initialize WebGL");
    });
    maplibreLayer.remove.mockImplementation(() => {
      throw new Error("nothing to remove");
    });

    await createBaseLayer(leaflet, map, false, TOKEN);

    expect(isRaster()).toBe(true);
  });
});

describe("setDarkMode", () => {
  beforeEach(() => {
    glMap.setStyle.mockClear();
  });

  it("swaps the style, and ignores a repeat of the current mode", async () => {
    const createBaseLayer = await setWebGL2(true);
    const baseLayer = await createBaseLayer(leaflet, map, false, TOKEN);

    baseLayer.setDarkMode(true);
    await vi.waitFor(() => expect(glMap.setStyle).toHaveBeenCalledOnce());

    baseLayer.setDarkMode(true);
    expect(glMap.setStyle).toHaveBeenCalledOnce();
  });

  // A failed request must roll back to the style that is actually on screen.
  // Rolling back to the opposite of the failed request instead would desync
  // the tracked mode, and the next toggle to that mode would do nothing.
  it("can retry a mode whose request failed while another was in flight", async () => {
    const createBaseLayer = await setWebGL2(true);
    const baseLayer = await createBaseLayer(leaflet, map, false, TOKEN);

    const failing = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", failing);

    // Dark is superseded by light, which then fails: the map is still light.
    baseLayer.setDarkMode(true);
    baseLayer.setDarkMode(false);
    await vi.waitFor(() => expect(failing).toHaveBeenCalledTimes(2));
    // Both rejections have to land before the retry, or this passes whatever
    // the rollback does.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => structuredClone(STYLE) }))
    );
    baseLayer.setDarkMode(true);

    await vi.waitFor(() => expect(glMap.setStyle).toHaveBeenCalledOnce());
  });

  // Styles are fetched, so a burst of theme changes can resolve out of order.
  // Applying a stale one would leave the map on the wrong theme for good.
  it("ignores a style that resolves after a newer request", async () => {
    const createBaseLayer = await setWebGL2(true);
    const resolvers: ((value: unknown) => void)[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolvers.push(resolve);
          })
      )
    );

    const styleResponse = (name: string) => ({
      json: async () => ({ ...structuredClone(STYLE), name }),
    });

    // The layer only settles once its first style resolves, so let that one
    // through before the map exists to switch.
    const pending = createBaseLayer(leaflet, map, false, TOKEN);
    await vi.waitFor(() => expect(resolvers).toHaveLength(1));
    resolvers.shift()!(styleResponse("light"));
    const baseLayer = await pending;

    baseLayer.setDarkMode(true);
    baseLayer.setDarkMode(false);
    await vi.waitFor(() => expect(resolvers).toHaveLength(2));

    // The dark request, which is no longer the newest, comes back last.
    resolvers[1](styleResponse("light"));
    resolvers[0](styleResponse("dark"));

    await vi.waitFor(() => expect(glMap.setStyle).toHaveBeenCalledOnce());
    expect(glMap.setStyle.mock.calls[0][0]).toMatchObject({ name: "light" });
  });
});

// Browsers cap the number of live WebGL contexts and drop the oldest. With
// more map cards than that cap - measured at 16 in Chrome - the first cards
// lose their context and never get it back, because nothing frees a slot.
describe("WebGL context loss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back to raster tiles when the context stays lost", async () => {
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);
    expect(leaflet.tileLayer).not.toHaveBeenCalled();

    glHandlers.webglcontextlost();
    vi.runAllTimers();

    expect(maplibreLayer.remove).toHaveBeenCalled();
    expect(isRaster()).toBe(true);
  });

  it("keeps the vector layer when the context comes back", async () => {
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);

    glHandlers.webglcontextlost();
    glHandlers.webglcontextrestored();
    vi.runAllTimers();

    expect(maplibreLayer.remove).not.toHaveBeenCalled();
    expect(leaflet.tileLayer).not.toHaveBeenCalled();
  });

  // Backgrounding a tab loses the context too, and there it comes back when
  // the page is shown again. Running the clock anyway would mean switching
  // apps for a few seconds was enough to come back to a raster map.
  it("waits for the page to be visible before falling back", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);

    glHandlers.webglcontextlost();
    vi.runAllTimers();
    expect(leaflet.tileLayer).not.toHaveBeenCalled();

    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    vi.runAllTimers();

    expect(isRaster()).toBe(true);
  });

  it("keeps the vector layer when a hidden page gets its context back", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);

    glHandlers.webglcontextlost();
    glHandlers.webglcontextrestored();

    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    vi.runAllTimers();

    expect(leaflet.tileLayer).not.toHaveBeenCalled();
  });

  it("stops listening for visibility once it has fallen back", async () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);

    glHandlers.webglcontextlost();
    vi.runAllTimers();

    expect(remove).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    // And a later visibility change must not add a second raster layer.
    document.dispatchEvent(new Event("visibilitychange"));
    vi.runAllTimers();
    expect(isRaster()).toBe(true);
  });

  it("stops answering theme changes once it has fallen back", async () => {
    const createBaseLayer = await setWebGL2(true);
    const baseLayer = await createBaseLayer(leaflet, map, false, TOKEN);

    glHandlers.webglcontextlost();
    vi.runAllTimers();
    baseLayer.setDarkMode(true);

    expect(glMap.setStyle).not.toHaveBeenCalled();
  });
});

// A refused request leaves the source dead: the TileJSON is fetched once and
// MapLibre never retries it, so the map stays blank until the style is
// applied again.
describe("recovering from a refused token", () => {
  it("asks for a new token and re-applies the style once it arrives", async () => {
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);
    glMap.setStyle.mockClear();

    glHandlers.error({ error: { status: 403 } });
    expect(refreshMapTilesToken).toHaveBeenCalled();

    emitToken("fresh-token");
    await vi.waitFor(() => expect(glMap.setStyle).toHaveBeenCalledOnce());
  });

  it("does not keep asking while the proxy refuses for another reason", async () => {
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);

    for (let i = 0; i < 5; i++) {
      glHandlers.error({ error: { status: 403 } });
    }

    expect(refreshMapTilesToken).toHaveBeenCalledOnce();
  });

  // The style itself always loads - it is a local file - so applying one while
  // the token is still stale says nothing about whether requests get through.
  it("still recovers when the theme changes before the token arrives", async () => {
    const createBaseLayer = await setWebGL2(true);
    const baseLayer = await createBaseLayer(leaflet, map, false, TOKEN);
    glMap.setStyle.mockClear();

    glHandlers.error({ error: { status: 403 } });
    baseLayer.setDarkMode(true);
    await vi.waitFor(() => expect(glMap.setStyle).toHaveBeenCalledOnce());

    emitToken("fresh-token");
    await vi.waitFor(() => expect(glMap.setStyle).toHaveBeenCalledTimes(2));
  });

  // During a restart the proxy can be unregistered rather than refusing, and a
  // dropped connection reports no status at all. Both leave the source dead.
  it.each([[404], [undefined]])(
    "also recovers from status %s",
    async (status) => {
      const createBaseLayer = await setWebGL2(true);
      await createBaseLayer(leaflet, map, false, TOKEN);
      glMap.setStyle.mockClear();

      glHandlers.error({ error: { status } });
      expect(refreshMapTilesToken).toHaveBeenCalled();

      emitToken("fresh-token");
      await vi.waitFor(() => expect(glMap.setStyle).toHaveBeenCalledOnce());
    }
  );

  it("ignores errors that are not a refusal", async () => {
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);

    glHandlers.error({ error: { status: 500 } });

    expect(refreshMapTilesToken).not.toHaveBeenCalled();
  });

  it("leaves a working map alone when the token is merely refreshed", async () => {
    const createBaseLayer = await setWebGL2(true);
    await createBaseLayer(leaflet, map, false, TOKEN);
    glMap.setStyle.mockClear();

    emitToken("fresh-token");
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(glMap.setStyle).not.toHaveBeenCalled();
  });

  it("redraws the raster layer so refused tiles are asked for again", async () => {
    const createBaseLayer = await setWebGL2(false);
    await createBaseLayer(leaflet, map, false, TOKEN);

    emitToken("fresh-token");

    expect(rasterLayer.options.token).toBe("fresh-token");
    expect(rasterLayer.redraw).toHaveBeenCalled();
  });
});
