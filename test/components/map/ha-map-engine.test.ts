import type { HassEntities } from "home-assistant-js-websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MapEngine,
  MapEngineOptions,
  MapMarkerHandle,
} from "../../../src/common/map/map-engine";
import "../../../src/components/map/ha-map";
import type { HaMap } from "../../../src/components/map/ha-map";

// ha-map picks its engine at runtime: MapLibre GL where WebGL2 is available,
// Leaflet otherwise or after MapLibre fails. jsdom has no WebGL2 and cannot
// run MapLibre, so the probe is stubbed and the MapLibre engine is replaced
// by a fake that records what ha-map asks of it. The Leaflet fallback is
// real, as in the ha-map fit tests.

const webgl2 = vi.hoisted(() => ({ supported: true }));

vi.mock("../../../src/common/map/base-layer", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  supportsWebGL2: () => webgl2.supported,
}));

const fakeEngine = vi.hoisted(() => {
  class FakeMapLibreEngine implements MapEngine {
    static instances: FakeMapLibreEngine[] = [];

    static failInit = false;

    /** When set, init waits for it, so events can be fired mid-setup */
    static initGate?: Promise<void>;

    options?: MapEngineOptions;

    constructor() {
      FakeMapLibreEngine.instances.push(this);
    }

    init = vi.fn(async (_container: HTMLElement, options: MapEngineOptions) => {
      this.options = options;
      await FakeMapLibreEngine.initGate;
      if (FakeMapLibreEngine.failInit) {
        throw new Error("WebGL context refused");
      }
    });

    destroy = vi.fn();

    invalidateSize = vi.fn();

    hasUsableSize = () => true;

    setDarkMode = vi.fn();

    setZoomControlPosition = vi.fn();

    setScaleRuler = vi.fn();

    setView = vi.fn();

    setZoom = vi.fn();

    fitBounds = vi.fn();

    panTo = vi.fn();

    containsLocation = () => true;

    addMarker = vi.fn((_element, location, options): MapMarkerHandle => ({
      location,
      clusterData: options.clusterData,
      remove: vi.fn(),
    }));

    addCircle = vi.fn(() => ({ remove: vi.fn() }));

    addPath = vi.fn(() => ({ remove: vi.fn() }));

    setClustering = vi.fn();

    refreshClusters = vi.fn();
  }
  return FakeMapLibreEngine;
});

vi.mock("../../../src/common/map/engines/maplibre-map-engine", () => ({
  MapLibreMapEngine: fakeEngine,
}));

class MockResizeObserver {
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

const leafletMap = (el: HaMap) => (el as any)._engine?.leafletMap;
const isLoaded = (el: HaMap) => (el as any)._loaded as boolean;
const entityHandles = (el: HaMap) =>
  (el as any)._entityHandles as MapMarkerHandle[];

const createMap = async (): Promise<HaMap> => {
  const el = document.createElement("ha-map");
  el.entities = ["device_tracker.paulus", "device_tracker.anne_therese"];
  el.clusterMarkers = false;
  (el as any)._states = STATES;
  (el as any)._config = {
    config: { latitude: 52.3731339, longitude: 4.8903147 },
  };
  document.body.appendChild(el);
  await vi.waitUntil(() => isLoaded(el));
  await el.updateComplete;
  return el;
};

describe("ha-map engine selection", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    webgl2.supported = true;
    fakeEngine.failInit = false;
    fakeEngine.initGate = undefined;
    fakeEngine.instances.length = 0;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("runs on the MapLibre engine when WebGL2 is available", async () => {
    const el = await createMap();

    expect(fakeEngine.instances).toHaveLength(1);
    const engine = fakeEngine.instances[0];
    expect(engine.init).toHaveBeenCalledOnce();
    expect(engine.options?.rasterOnly).toBeFalsy();
    expect(leafletMap(el)).toBeUndefined();
    // Entities are drawn through the engine
    expect(engine.addMarker).toHaveBeenCalledTimes(2);
    expect(entityHandles(el)).toHaveLength(2);
  });

  it("runs on Leaflet when WebGL2 is not available", async () => {
    webgl2.supported = false;
    const el = await createMap();

    expect(fakeEngine.instances).toHaveLength(0);
    expect(leafletMap(el)).toBeDefined();
    expect(entityHandles(el)).toHaveLength(2);
  });

  it("falls back to Leaflet when the MapLibre engine cannot start", async () => {
    fakeEngine.failInit = true;
    const el = await createMap();

    // MapLibre was tried once, then abandoned
    expect(fakeEngine.instances).toHaveLength(1);
    expect(fakeEngine.instances[0].init).toHaveBeenCalledOnce();
    expect(leafletMap(el)).toBeDefined();
    // Entities are drawn on the fallback
    expect(entityHandles(el)).toHaveLength(2);
  });

  it("falls back to Leaflet when the engine fails while still setting up", async () => {
    let openGate!: () => void;
    fakeEngine.initGate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    const el = document.createElement("ha-map");
    el.entities = ["device_tracker.paulus", "device_tracker.anne_therese"];
    el.clusterMarkers = false;
    (el as any)._states = STATES;
    (el as any)._config = {
      config: { latitude: 52.3731339, longitude: 4.8903147 },
    };
    document.body.appendChild(el);
    await vi.waitUntil(() => fakeEngine.instances[0]?.options);
    const engine = fakeEngine.instances[0];

    // The context is lost before init has resolved
    engine.options!.events.fatal!();
    expect(isLoaded(el)).toBe(false);
    openGate();

    await vi.waitUntil(() => leafletMap(el) !== undefined && isLoaded(el));
    await el.updateComplete;
    // The failed engine was never installed, and the fallback drew the map
    expect(engine.destroy).toHaveBeenCalledOnce();
    expect(fakeEngine.instances).toHaveLength(1);
    expect(entityHandles(el)).toHaveLength(2);
  });

  it("rebuilds on Leaflet after a fatal engine failure", async () => {
    const el = await createMap();
    const engine = fakeEngine.instances[0];
    const handlesBefore = entityHandles(el);

    engine.options!.events.fatal!();
    await vi.waitUntil(() => leafletMap(el) !== undefined && isLoaded(el));
    await el.updateComplete;

    expect(engine.destroy).toHaveBeenCalledOnce();
    // Only one MapLibre attempt; the rebuild went straight to Leaflet
    expect(fakeEngine.instances).toHaveLength(1);
    // Entities are redrawn on the new engine, not carried over
    expect(entityHandles(el)).toHaveLength(2);
    expect(entityHandles(el)).not.toBe(handlesBefore);
  });
});
