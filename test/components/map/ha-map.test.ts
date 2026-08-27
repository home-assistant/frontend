import type { HassEntities } from "home-assistant-js-websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as LeafletModule from "leaflet";
import "../../../src/components/map/ha-map";
import type { HaMap } from "../../../src/components/map/ha-map";

vi.mock("maplibre-gl", () => ({ setWorkerUrl: vi.fn() }));

vi.mock("@maplibre/maplibre-gl-leaflet", async () => {
  const leafletModule = (await vi.importActual(
    "leaflet"
  )) as typeof LeafletModule & {
    default: typeof LeafletModule;
  };
  return { maplibreGL: () => leafletModule.default.layerGroup() };
});

type ROCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver
) => void;

const resizeCallbacks: ROCallback[] = [];

class MockResizeObserver {
  constructor(cb: ROCallback) {
    resizeCallbacks.push(cb);
  }

  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
}

const STATES = {
  "device_tracker.paulus": {
    entity_id: "device_tracker.paulus",
    state: "not_home",
    attributes: {
      friendly_name: "Paulus",
      latitude: 52.372,
      longitude: 4.89,
    },
    context: { id: "1", user_id: null, parent_id: null },
    last_changed: "2026-01-01T00:00:00Z",
    last_updated: "2026-01-01T00:00:00Z",
  },
  "device_tracker.anne_therese": {
    entity_id: "device_tracker.anne_therese",
    state: "not_home",
    attributes: {
      friendly_name: "Anne Therese",
      latitude: 52.377,
      longitude: 4.895,
    },
    context: { id: "2", user_id: null, parent_id: null },
    last_changed: "2026-01-01T00:00:00Z",
    last_updated: "2026-01-01T00:00:00Z",
  },
} as unknown as HassEntities;

const createMap = async (): Promise<HaMap> => {
  const el = document.createElement("ha-map");
  el.entities = [
    "device_tracker.paulus",
    "device_tracker.anne_therese",
  ] as string[];
  el.clusterMarkers = false;
  (el as any)._states = STATES;
  (el as any)._config = {
    config: { latitude: 52.3731339, longitude: 4.8903147 },
  };
  document.body.appendChild(el);
  await vi.waitUntil(() => el.leafletMap !== undefined && (el as any)._loaded);
  await el.updateComplete;
  return el;
};

const setMapSize = (el: HaMap, width: number, height: number) => {
  const mapDiv = el.shadowRoot!.getElementById("map")!;
  Object.defineProperty(mapDiv, "clientWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(mapDiv, "clientHeight", {
    value: height,
    configurable: true,
  });
};

const fireResizeObservers = () => {
  resizeCallbacks.forEach((cb) => cb([], {} as ResizeObserver));
};

describe("ha-map", () => {
  beforeEach(() => {
    resizeCallbacks.length = 0;
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("fits the map to its entities once the container is laid out", async () => {
    // While the container still has a 0x0 size (before browser layout),
    // Leaflet cannot compute a fit zoom.
    const el = await createMap();

    // Container gets its size and the resize observer fires, as happens
    // when the browser completes layout after the map loaded.
    setMapSize(el, 800, 500);
    fireResizeObservers();
    await el.updateComplete;

    const map = el.leafletMap!;
    // The map should be fitted to the markers, not zoomed out to the world.
    expect(map.getZoom()).toBeGreaterThanOrEqual(10);
    expect(map.getCenter().lat).toBeCloseTo(52.3745, 2);
    expect(map.getCenter().lng).toBeCloseTo(4.8925, 2);
  });

  it("does not defer fitting when the container already has a size", async () => {
    const originalWidth = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "clientWidth"
    );
    const originalHeight = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "clientHeight"
    );
    Object.defineProperty(Element.prototype, "clientWidth", {
      get: () => 800,
      configurable: true,
    });
    Object.defineProperty(Element.prototype, "clientHeight", {
      get: () => 500,
      configurable: true,
    });

    try {
      const el = await createMap();
      const map = el.leafletMap!;
      expect(map.getZoom()).toBeGreaterThanOrEqual(10);
      expect(map.getCenter().lat).toBeCloseTo(52.3745, 2);
      expect(map.getCenter().lng).toBeCloseTo(4.8925, 2);
    } finally {
      Object.defineProperty(Element.prototype, "clientWidth", originalWidth!);
      Object.defineProperty(Element.prototype, "clientHeight", originalHeight!);
    }
  });
});
