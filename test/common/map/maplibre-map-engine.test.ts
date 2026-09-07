import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTEXT_RESTORE_GRACE } from "../../../src/common/map/base-layer";
import { MapLibreMapEngine } from "../../../src/common/map/engines/maplibre-map-engine";
import type {
  MapEngineEvents,
  MapLatLng,
  MapMarkerHandle,
} from "../../../src/common/map/map-engine";

// The MapLibre engine cannot run in jsdom (no WebGL2), so maplibre-gl is
// replaced by a fake map that models the parts the engine depends on: the
// style lifecycle (a swap leaves the style unloaded until it loads), sources
// and layers, screen projection for clustering, and WebGL context events.

type Listener = (ev?: any) => void;

const fakes = vi.hoisted(() => {
  const baseStyle = (): StyleSpecification => ({
    version: 8,
    sources: {},
    layers: [
      { id: "land", type: "background" },
      { id: "labels", type: "symbol", source: "osm", "source-layer": "place" },
    ],
  });

  class FakeMarker {
    static all: FakeMarker[] = [];

    lngLat?: [number, number];

    options: any;

    onMap = false;

    constructor(options: any) {
      this.options = options;
    }

    setLngLat(lngLat: [number, number]) {
      this.lngLat = lngLat;
      return this;
    }

    getLngLat() {
      return { lng: this.lngLat![0], lat: this.lngLat![1] };
    }

    addTo() {
      this.onMap = true;
      FakeMarker.all.push(this);
      document.body.appendChild(this.options.element);
      return this;
    }

    remove() {
      this.onMap = false;
      const index = FakeMarker.all.indexOf(this);
      if (index !== -1) {
        FakeMarker.all.splice(index, 1);
      }
      (this.options.element as HTMLElement).remove();
      return this;
    }

    getElement() {
      return this.options.element as HTMLElement;
    }

    on() {
      return this;
    }
  }

  class FakePopup {
    setLngLat() {
      return this;
    }

    setHTML() {
      return this;
    }

    addTo() {
      return this;
    }

    remove() {
      return this;
    }
  }

  class FakeMap {
    static instances: FakeMap[] = [];

    /** Whether new maps start with their style loaded */
    static startLoaded = true;

    /** Makes the next setStyle call throw, like an invalid style would */
    static failNextSetStyle = false;

    style: StyleSpecification;

    styleLoaded: boolean;

    listeners: Record<string, { layer?: string; handler: Listener }[]> = {};

    fitBounds = vi.fn();

    easeTo = vi.fn();

    jumpTo = vi.fn();

    resize = vi.fn(() => {
      this.fire("movestart");
      this.fire("move");
      this.fire("moveend");
    });

    remove = vi.fn();

    addControl = vi.fn();

    removeControl = vi.fn();

    setStyle = vi.fn(
      (
        style: StyleSpecification,
        options?: {
          transformStyle?: (
            previous: StyleSpecification | undefined,
            next: StyleSpecification
          ) => StyleSpecification;
        }
      ) => {
        if (FakeMap.failNextSetStyle) {
          FakeMap.failNextSetStyle = false;
          throw new Error("Invalid style");
        }
        // MapLibre hands over the current style only once it has loaded
        this.style = options?.transformStyle
          ? options.transformStyle(
              this.styleLoaded ? this.style : undefined,
              style
            )
          : style;
        // A rebuilt style is unloaded until the next frame
        this.styleLoaded = false;
      }
    );

    touchZoomRotate = { disableRotation: vi.fn() };

    keyboard = { disableRotation: vi.fn() };

    scrollZoom = { setWheelZoomRate: vi.fn() };

    private _container: HTMLElement;

    constructor(options: {
      container: HTMLElement;
      style: StyleSpecification;
    }) {
      this._container = options.container;
      this.style = options.style;
      this.styleLoaded = FakeMap.startLoaded;
      FakeMap.instances.push(this);
    }

    /** The style finished loading, as MapLibre reports a frame later */
    loadStyle() {
      this.styleLoaded = true;
      this.fire("style.load");
      this.fire("styledata");
    }

    on(type: string, layerOrHandler: string | Listener, handler?: Listener) {
      const entry =
        typeof layerOrHandler === "string"
          ? { layer: layerOrHandler, handler: handler! }
          : { handler: layerOrHandler };
      (this.listeners[type] ??= []).push(entry);
      return this;
    }

    once(type: string, handler: Listener) {
      const wrapped: Listener = (ev) => {
        this.off(type, wrapped);
        handler(ev);
      };
      return this.on(type, wrapped);
    }

    off(type: string, layerOrHandler: string | Listener, handler?: Listener) {
      const target =
        typeof layerOrHandler === "string" ? handler : layerOrHandler;
      this.listeners[type] = (this.listeners[type] ?? []).filter(
        (entry) => entry.handler !== target
      );
      return this;
    }

    fire(type: string, ev: any = {}) {
      [...(this.listeners[type] ?? [])].forEach((entry) => entry.handler(ev));
    }

    isStyleLoaded() {
      return this.styleLoaded;
    }

    // Like MapLibre: Style.serialize() returns undefined until the style has
    // loaded, and getStyle() is that serialization
    getStyle() {
      return this.styleLoaded ? this.style : undefined;
    }

    private _assertLoaded() {
      if (!this.styleLoaded) {
        throw new Error("Style is not done loading");
      }
    }

    addSource(id: string, source: any) {
      this._assertLoaded();
      this.style.sources[id] = source;
    }

    getSource(id: string) {
      return this.style.sources[id];
    }

    removeSource(id: string) {
      this._assertLoaded();
      delete this.style.sources[id];
    }

    addLayer(layer: LayerSpecification, beforeId?: string) {
      this._assertLoaded();
      const index = beforeId
        ? this.style.layers.findIndex((candidate) => candidate.id === beforeId)
        : -1;
      this.style.layers.splice(
        index === -1 ? this.style.layers.length : index,
        0,
        layer
      );
    }

    getLayer(id: string) {
      return this.style.layers.find((layer) => layer.id === id);
    }

    removeLayer(id: string) {
      this._assertLoaded();
      this.style.layers = this.style.layers.filter((layer) => layer.id !== id);
    }

    // 0.001 degrees is 10 screen pixels
    project([lng, lat]: [number, number]) {
      return { x: lng * 10000, y: -lat * 10000 };
    }

    zoom = 12;

    getZoom() {
      return this.zoom;
    }

    getMaxZoom() {
      return 19;
    }

    getContainer() {
      return this._container;
    }

    getCanvas() {
      return { style: {} as CSSStyleDeclaration };
    }

    getBounds() {
      return { contains: () => true };
    }

    queryRenderedFeatures() {
      return [];
    }
  }

  return { baseStyle, FakeMap, FakeMarker, FakePopup };
});

vi.mock("maplibre-gl", () => ({
  default: {
    Map: fakes.FakeMap,
    Marker: fakes.FakeMarker,
    Popup: fakes.FakePopup,
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    setRTLTextPlugin: vi.fn(),
  },
}));

const loadStyle = vi.hoisted(() => vi.fn());
vi.mock("../../../src/common/map/base-layer", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  loadStyle,
  ensureRTLTextPlugin: vi.fn(),
}));

const tokenListeners = vi.hoisted(() => new Set<(token: string) => void>());
const refreshMapTilesToken = vi.hoisted(() => vi.fn());
vi.mock("../../../src/data/map_tiles", () => ({
  MAP_TILES_PATH: "/api/map_tiles",
  mapTilesUrl: (path: string) => path,
  withMapTilesToken: (url: string) => url,
  refreshMapTilesToken,
  subscribeMapTilesToken: (listener: (token: string) => void) => {
    tokenListeners.add(listener);
    return () => tokenListeners.delete(listener);
  },
}));

const fakeMap = fakes.FakeMap;
const fakeMarker = fakes.FakeMarker;
const { baseStyle } = fakes;

const flush = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const createEngine = async (events: Partial<MapEngineEvents> = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const engine = new MapLibreMapEngine();
  const ready = engine.init(container, {
    center: [52, 4],
    zoom: 13,
    darkMode: false,
    zoomControlPosition: "topleft",
    events,
  });
  await vi.waitUntil(() => fakeMap.instances.length > 0);
  const map = fakeMap.instances[fakeMap.instances.length - 1];
  return { engine, map, ready };
};

const customSourceIds = (map: InstanceType<typeof fakeMap>) =>
  Object.keys(map.style.sources).filter((id) => id.startsWith("ha-"));

const layerIds = (map: InstanceType<typeof fakeMap>) =>
  map.style.layers.map((layer) => layer.id);

describe("MapLibreMapEngine", () => {
  beforeEach(() => {
    fakeMap.instances.length = 0;
    fakeMap.startLoaded = true;
    fakeMap.failNextSetStyle = false;
    fakeMarker.all.length = 0;
    tokenListeners.clear();
    refreshMapTilesToken.mockClear();
    loadStyle.mockReset();
    loadStyle.mockImplementation(async () => baseStyle());
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  describe("style lifecycle", () => {
    it("waits for the initial style before resolving init", async () => {
      fakeMap.startLoaded = false;
      const { map, ready } = await createEngine();
      let resolved = false;
      ready.then(() => {
        resolved = true;
      });

      await flush();
      expect(resolved).toBe(false);
      map.loadStyle();
      await ready;
      expect(resolved).toBe(true);
    });

    it("settles a pending init when destroyed", async () => {
      fakeMap.startLoaded = false;
      const { engine, ready } = await createEngine();
      let resolved = false;
      ready.then(() => {
        resolved = true;
      });

      await flush();
      expect(resolved).toBe(false);
      engine.destroy();
      await ready;
      expect(resolved).toBe(true);
    });

    it("queues sources and layers while a swapped style is loading", async () => {
      const { engine, map, ready } = await createEngine();
      await ready;

      engine.setDarkMode(true);
      await flush();
      expect(map.setStyle).toHaveBeenCalledOnce();
      expect(map.isStyleLoaded()).toBe(false);

      // Adding to an unloaded style would throw; the engine must hold it
      const circle = engine.addCircle([52, 4], { radius: 100, color: "red" });
      expect(customSourceIds(map)).toHaveLength(0);

      map.loadStyle();
      expect(customSourceIds(map)).toHaveLength(1);
      expect(layerIds(map)).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/-fill$/),
          expect.stringMatching(/-line$/),
        ])
      );

      circle.remove();
      expect(customSourceIds(map)).toHaveLength(0);
    });

    it("carries its own sources and layers over a style swap, under the labels", async () => {
      const { engine, map, ready } = await createEngine();
      await ready;
      engine.addCircle([52, 4], { radius: 100, color: "red" });
      const customLayers = layerIds(map).filter((id) => id.startsWith("ha-"));
      expect(customLayers).toHaveLength(2);

      engine.setDarkMode(true);
      await flush();
      map.loadStyle();

      // The new style is a fresh copy from loadStyle; the circle survived it
      expect(customSourceIds(map)).toHaveLength(1);
      const ids = layerIds(map);
      for (const id of customLayers) {
        expect(ids.indexOf(id)).toBeGreaterThan(ids.indexOf("land"));
        expect(ids.indexOf(id)).toBeLessThan(ids.indexOf("labels"));
      }
    });

    it("keeps its sources and layers when a swap arrives while another is loading", async () => {
      const { engine, map, ready } = await createEngine();
      await ready;
      engine.addCircle([52, 4], { radius: 100, color: "red" });

      engine.setDarkMode(true);
      await flush();
      // The dark style has not loaded, so this swap sees no previous style
      engine.setDarkMode(false);
      await flush();
      expect(map.setStyle).toHaveBeenCalledTimes(2);

      map.loadStyle();
      expect(customSourceIds(map)).toHaveLength(1);
      expect(layerIds(map).filter((id) => id.startsWith("ha-"))).toHaveLength(
        2
      );
    });

    it("does not swap twice for the same mode, and retries after a failed swap", async () => {
      const { engine, map, ready } = await createEngine();
      await ready;
      expect(loadStyle).toHaveBeenCalledTimes(1);

      engine.setDarkMode(false);
      await flush();
      expect(loadStyle).toHaveBeenCalledTimes(1);

      // The dark style fails to fetch: the map stays light and dark can be
      // requested again
      loadStyle.mockRejectedValueOnce(new Error("offline"));
      engine.setDarkMode(true);
      await flush();
      expect(map.setStyle).not.toHaveBeenCalled();

      engine.setDarkMode(true);
      await flush();
      expect(loadStyle).toHaveBeenCalledTimes(3);
      expect(map.setStyle).toHaveBeenCalledOnce();
    });

    it("does not record a mode whose style could not be applied", async () => {
      const { engine, map, ready } = await createEngine();
      await ready;

      fakeMap.failNextSetStyle = true;
      engine.setDarkMode(true);
      await flush();
      expect(map.setStyle).toHaveBeenCalledOnce();
      expect(map.isStyleLoaded()).toBe(true);

      // Dark was not applied, so asking for it again applies it
      engine.setDarkMode(true);
      await flush();
      expect(map.setStyle).toHaveBeenCalledTimes(2);
      expect(map.isStyleLoaded()).toBe(false);
    });

    it("applies the style again once a refused token is replaced", async () => {
      const { map, ready } = await createEngine();
      await ready;

      map.fire("error", { error: { status: 403 } });
      expect(refreshMapTilesToken).toHaveBeenCalledOnce();
      expect(loadStyle).toHaveBeenCalledTimes(1);

      tokenListeners.forEach((listener) => listener("new-token"));
      await flush();
      expect(loadStyle).toHaveBeenCalledTimes(2);
      expect(map.setStyle).toHaveBeenCalledOnce();
    });
  });

  describe("WebGL context loss", () => {
    it("reports a fatal failure when a lost context is not restored in time", async () => {
      vi.useFakeTimers();
      const fatal = vi.fn();
      const { map, ready } = await createEngine({ fatal });
      await ready;

      map.fire("webglcontextlost");
      vi.advanceTimersByTime(CONTEXT_RESTORE_GRACE - 1);
      expect(fatal).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fatal).toHaveBeenCalledOnce();
    });

    it("stays on the engine when the context comes back within the grace period", async () => {
      vi.useFakeTimers();
      const fatal = vi.fn();
      const { map, ready } = await createEngine({ fatal });
      await ready;

      map.fire("webglcontextlost");
      vi.advanceTimersByTime(CONTEXT_RESTORE_GRACE / 2);
      map.fire("webglcontextrestored");
      vi.advanceTimersByTime(CONTEXT_RESTORE_GRACE);
      expect(fatal).not.toHaveBeenCalled();
    });

    it("does not report a failure after being destroyed", async () => {
      vi.useFakeTimers();
      const fatal = vi.fn();
      const { engine, map, ready } = await createEngine({ fatal });
      await ready;

      map.fire("webglcontextlost");
      engine.destroy();
      vi.advanceTimersByTime(CONTEXT_RESTORE_GRACE);
      expect(fatal).not.toHaveBeenCalled();
      expect(map.remove).toHaveBeenCalledOnce();
    });
  });

  describe("camera events", () => {
    it("does not report a resize as the map moving", async () => {
      const moveStart = vi.fn();
      const { engine, map, ready } = await createEngine({ moveStart });
      await ready;

      engine.invalidateSize();
      expect(map.resize).toHaveBeenCalledOnce();
      expect(moveStart).not.toHaveBeenCalled();

      map.fire("movestart");
      expect(moveStart).toHaveBeenCalledOnce();
    });
  });

  describe("markers", () => {
    it("lets input through non-interactive markers", async () => {
      const { engine, ready } = await createEngine();
      await ready;

      const interactive = document.createElement("div");
      engine.addMarker(interactive, [52, 4], { size: [36, 36] });
      const passive = document.createElement("div");
      engine.addMarker(passive, [52, 4], {
        size: [36, 36],
        interactive: false,
      });

      expect(interactive.tabIndex).toBe(0);
      expect(interactive.style.pointerEvents).toBe("");
      expect(passive.style.pointerEvents).toBe("none");
    });
  });

  describe("clustering", () => {
    const addMarker = (
      engine: MapLibreMapEngine,
      location: MapLatLng,
      clusterData?: unknown
    ) =>
      engine.addMarker(document.createElement("div"), location, {
        size: [48, 48],
        cluster: true,
        clusterData,
      });

    const iconBuilder = vi.fn((members: MapMarkerHandle[]) => ({
      element: Object.assign(document.createElement("div"), {
        textContent: String(members.length),
      }),
      size: [40, 40] as [number, number],
    }));

    beforeEach(() => {
      iconBuilder.mockClear();
    });

    it("shows clusterable markers only once clustering is configured", async () => {
      const { engine, ready } = await createEngine();
      await ready;

      addMarker(engine, [52, 4]);
      expect(fakeMarker.all).toHaveLength(0);

      engine.setClustering(null);
      expect(fakeMarker.all).toHaveLength(1);
    });

    it("groups markers within the radius on screen and leaves the rest alone", async () => {
      const { engine, ready } = await createEngine();
      await ready;

      // 20px apart, then 100px further
      addMarker(engine, [52, 4.0]);
      addMarker(engine, [52, 4.002]);
      addMarker(engine, [52, 4.012]);
      engine.setClustering({ radius: 40, iconBuilder });

      expect(iconBuilder).toHaveBeenCalledOnce();
      expect(iconBuilder.mock.calls[0][0]).toHaveLength(2);
      // One cluster icon and one lone marker
      expect(fakeMarker.all).toHaveLength(2);
    });

    it("groups markers sharing a key while they fit the group radius", async () => {
      const { engine, ready } = await createEngine();
      await ready;

      // 100px apart: too far for proximity, close enough for the zone group
      addMarker(engine, [52, 4.0], { zone: "home" });
      addMarker(engine, [52, 4.01], { zone: "home" });
      // Same distance, no key: clusters by proximity, so stays alone
      addMarker(engine, [52.01, 4.0]);
      engine.setClustering({
        radius: 40,
        groupRadius: 160,
        groupKey: (marker) =>
          (marker.clusterData as { zone?: string } | undefined)?.zone,
        iconBuilder,
      });

      expect(iconBuilder).toHaveBeenCalledOnce();
      expect(iconBuilder.mock.calls[0][0]).toHaveLength(2);
      expect(fakeMarker.all).toHaveLength(2);
    });

    it("falls back to proximity when a keyed group is spread too wide", async () => {
      const { engine, ready } = await createEngine();
      await ready;

      addMarker(engine, [52, 4.0], { zone: "home" });
      addMarker(engine, [52, 4.05], { zone: "home" });
      engine.setClustering({
        radius: 40,
        groupRadius: 160,
        groupKey: (marker) =>
          (marker.clusterData as { zone?: string } | undefined)?.zone,
        iconBuilder,
      });

      expect(iconBuilder).not.toHaveBeenCalled();
      expect(fakeMarker.all).toHaveLength(2);
    });

    it("drops removed markers from their cluster on refresh", async () => {
      const { engine, ready } = await createEngine();
      await ready;

      addMarker(engine, [52, 4.0]);
      const second = addMarker(engine, [52, 4.002]);
      engine.setClustering({ radius: 40, iconBuilder });
      expect(iconBuilder.mock.calls[0][0]).toHaveLength(2);

      second.remove();
      engine.refreshClusters();
      // A cluster of one is the marker itself
      expect(iconBuilder).toHaveBeenCalledOnce();
      expect(fakeMarker.all).toHaveLength(1);
    });

    const openBubble = () => {
      expect(fakeMarker.all).toHaveLength(1);
      const [bubble] = fakeMarker.all;
      expect(bubble.options.anchor).toBe("bottom");
      return (bubble.options.element as HTMLElement).querySelectorAll(
        ".cluster-open-members > *"
      );
    };

    it("opens a cluster whose members share a spot in a bubble", async () => {
      const { engine, map, ready } = await createEngine();
      await ready;

      const elements = [
        addMarker(engine, [52, 4]),
        addMarker(engine, [52, 4]),
        addMarker(engine, [52, 4]),
      ];
      engine.setClustering({ radius: 40, iconBuilder });
      expect(fakeMarker.all).toHaveLength(1);

      (iconBuilder.mock.results[0].value.element as HTMLElement).click();
      // Zooming would change nothing; the members themselves sit in a
      // bubble pointing at the spot
      expect(map.fitBounds).not.toHaveBeenCalled();
      expect(openBubble()).toHaveLength(elements.length);

      // A refresh keeps it open; regrouping after the map moves closes it
      engine.refreshClusters();
      expect(openBubble()).toHaveLength(elements.length);
      engine.setClustering({ radius: 40, iconBuilder });
      expect(iconBuilder).toHaveBeenCalledTimes(2);
      expect(fakeMarker.all).toHaveLength(1);
      expect(fakeMarker.all[0].options.anchor).toBeUndefined();
    });

    it("moves keyboard focus into an opened cluster and back to its icon", async () => {
      const { engine, ready } = await createEngine();
      await ready;

      const first = document.createElement("div");
      engine.addMarker(first, [52, 4], { size: [48, 48], cluster: true });
      addMarker(engine, [52, 4]);
      engine.setClustering({ radius: 40, iconBuilder });
      const icon = iconBuilder.mock.results[0].value.element as HTMLElement;

      icon.focus();
      icon.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(document.activeElement).toBe(first);

      // The bubble closes on the next regroup; focus lands on the new icon
      engine.setClustering({ radius: 40, iconBuilder });
      const reopened = iconBuilder.mock.results[1].value.element as HTMLElement;
      expect(document.activeElement).toBe(reopened);
    });

    it("opens a cluster at maximum zoom in a bubble", async () => {
      const { engine, map, ready } = await createEngine();
      await ready;
      map.zoom = map.getMaxZoom();

      addMarker(engine, [52, 4.0]);
      addMarker(engine, [52, 4.002]);
      engine.setClustering({ radius: 40, iconBuilder });

      (iconBuilder.mock.results[0].value.element as HTMLElement).click();
      expect(map.fitBounds).not.toHaveBeenCalled();
      expect(openBubble()).toHaveLength(2);
    });

    it("zooms in on a cluster's members when it is activated", async () => {
      const { engine, map, ready } = await createEngine();
      await ready;

      addMarker(engine, [52, 4.0]);
      addMarker(engine, [52, 4.002]);
      engine.setClustering({ radius: 40, iconBuilder });
      const icon = iconBuilder.mock.results[0].value.element as HTMLElement;

      icon.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      expect(map.fitBounds).toHaveBeenCalledOnce();
      icon.click();
      expect(map.fitBounds).toHaveBeenCalledTimes(2);
    });
  });
});
