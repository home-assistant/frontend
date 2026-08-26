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

const STYLE = {
  version: 8,
  sources: {},
  layers: [],
  sprite: [{ id: "basics", url: "/static/map/sprites/basics/sprites" }],
};

const rasterLayer = { addTo: vi.fn() };
const leaflet = {
  tileLayer: vi.fn(() => rasterLayer),
} as unknown as LeafletModuleType;

const map = {} as any;

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
  maplibreLayer.options = {};
  maplibreGL.mockReturnValue(maplibreLayer);
  maplibreLayer.addTo.mockImplementation(() => maplibreLayer);
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

    await createBaseLayer(leaflet, map, false);

    expect(isRaster()).toBe(true);
    expect(maplibreGL).not.toHaveBeenCalled();
    expect(rasterLayer.addTo).toHaveBeenCalledWith(map);
  });

  it("uses vector tiles when WebGL2 is available", async () => {
    const createBaseLayer = await setWebGL2(true);

    await createBaseLayer(leaflet, map, false);

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

    await createBaseLayer(leaflet, map, false);

    expect(isRaster()).toBe(true);
  });

  // The plugin only builds the MapLibre map once the layer is added, so this
  // is where a blocked worker or a refused WebGL context surfaces.
  it("falls back to raster tiles when adding the vector layer throws", async () => {
    const createBaseLayer = await setWebGL2(true);
    maplibreLayer.addTo.mockImplementation(() => {
      throw new Error("Failed to initialize WebGL");
    });

    await createBaseLayer(leaflet, map, false);

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

    await createBaseLayer(leaflet, map, false);

    expect(isRaster()).toBe(true);
  });
});

describe("setDarkMode", () => {
  const glMap = { setStyle: vi.fn() };

  beforeEach(() => {
    maplibreLayer.getMaplibreMap.mockReturnValue(glMap);
    glMap.setStyle.mockClear();
  });

  it("swaps the style, and ignores a repeat of the current mode", async () => {
    const createBaseLayer = await setWebGL2(true);
    const baseLayer = await createBaseLayer(leaflet, map, false);

    baseLayer.setDarkMode(true);
    await vi.waitFor(() => expect(glMap.setStyle).toHaveBeenCalledOnce());

    baseLayer.setDarkMode(true);
    expect(glMap.setStyle).toHaveBeenCalledOnce();
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
    const pending = createBaseLayer(leaflet, map, false);
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
