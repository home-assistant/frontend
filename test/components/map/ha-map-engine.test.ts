import type { HassEntities } from "home-assistant-js-websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MapEditableCircleHandle,
  MapEditableCircleOptions,
  MapEditableMarkerHandle,
  MapEditingSupport,
  MapEngine,
  MapEngineOptions,
  MapMarkerHandle,
} from "../../../src/common/map/map-engine";
import "../../../src/components/map/ha-map";
import type {
  HaMap,
  HaMapEditableLocation,
} from "../../../src/components/map/ha-map";

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

    /** Settles a pending init, as the real engine's destroy does */
    private _settleInit?: () => void;

    init = vi.fn(async (_container: HTMLElement, options: MapEngineOptions) => {
      this.options = options;
      await Promise.race([
        FakeMapLibreEngine.initGate,
        new Promise<void>((resolve) => {
          this._settleInit = resolve;
        }),
      ]);
      if (FakeMapLibreEngine.failInit) {
        throw new Error("WebGL context refused");
      }
    });

    destroy = vi.fn(() => {
      this._settleInit?.();
    });

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

    /** Editable circles and markers, with the callbacks ha-map passed */
    circles: (MapEditableCircleHandle & {
      options: MapEditableCircleOptions;
    })[] = [];

    draggables: (MapEditableMarkerHandle & {
      element: HTMLElement;
      options: { onDragEnd?: (location: [number, number]) => void };
    })[] = [];

    editing: MapEditingSupport = {
      addDraggableMarker: vi.fn((element, location, options) => {
        const handle = {
          location,
          element,
          options,
          clusterData: options.clusterData,
          setLocation: vi.fn((next: [number, number]) => {
            handle.location = next;
          }),
          remove: vi.fn(),
        };
        this.draggables.push(handle);
        return handle;
      }),
      addEditableCircle: vi.fn((center, options) => {
        const handle = {
          center,
          radius: options.radius,
          options,
          update: vi.fn((nextCenter: [number, number], nextRadius: number) => {
            handle.center = nextCenter;
            handle.radius = nextRadius;
          }),
          remove: vi.fn(),
        };
        this.circles.push(handle);
        return handle;
      }),
    };
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

    // MapLibre was tried once, torn down, then abandoned
    expect(fakeEngine.instances).toHaveLength(1);
    expect(fakeEngine.instances[0].init).toHaveBeenCalledOnce();
    expect(fakeEngine.instances[0].destroy).toHaveBeenCalledOnce();
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

    // The context is lost before init has resolved, and init never would
    // resolve on its own: tearing the engine down is what settles it
    engine.options!.events.fatal!();
    expect(isLoaded(el)).toBe(false);

    await vi.waitUntil(() => leafletMap(el) !== undefined && isLoaded(el));
    await el.updateComplete;
    // The failed engine was never installed, and the fallback drew the map
    expect(engine.destroy).toHaveBeenCalled();
    expect(fakeEngine.instances).toHaveLength(1);
    expect(entityHandles(el)).toHaveLength(2);
    openGate();
  });

  it("tears down an engine still setting up when disconnected, and sets up again on reconnect", async () => {
    let openGate!: () => void;
    fakeEngine.initGate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    const el = document.createElement("ha-map");
    el.entities = ["device_tracker.paulus"];
    el.clusterMarkers = false;
    (el as any)._states = STATES;
    (el as any)._config = {
      config: { latitude: 52.3731339, longitude: 4.8903147 },
    };
    document.body.appendChild(el);
    await vi.waitUntil(() => fakeEngine.instances[0]?.options);

    el.remove();
    expect(fakeEngine.instances[0].destroy).toHaveBeenCalledOnce();
    openGate();
    fakeEngine.initGate = undefined;

    document.body.appendChild(el);
    await vi.waitUntil(() => isLoaded(el));
    // The abandoned engine was not installed; a fresh one was set up
    expect(fakeEngine.instances).toHaveLength(2);
    expect(fakeEngine.instances[1].init).toHaveBeenCalledOnce();
    expect(fakeEngine.instances[1].destroy).not.toHaveBeenCalled();
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

describe("ha-map editable locations", () => {
  const HOME: HaMapEditableLocation = {
    id: "home",
    location: [52, 4],
    radius: 100,
    title: "Home",
    locationEditable: true,
    radiusEditable: true,
    activatable: true,
  };
  const PIN: HaMapEditableLocation = {
    id: "pin",
    location: [52, 5],
    locationEditable: true,
    activatable: true,
  };

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

  const createEditor = async (locations: HaMapEditableLocation[]) => {
    const el = document.createElement("ha-map");
    el.editableLocations = locations;
    (el as any)._config = {
      config: { latitude: 52.3731339, longitude: 4.8903147 },
    };
    const availability: boolean[] = [];
    el.addEventListener("editing-available-changed", (ev) => {
      availability.push((ev as CustomEvent).detail.available);
    });
    document.body.appendChild(el);
    await vi.waitUntil(() => isLoaded(el));
    await el.updateComplete;
    return { el, engine: fakeEngine.instances[0], availability };
  };

  it("draws circles and markers through the engine's editing support", async () => {
    const { engine, availability } = await createEditor([HOME, PIN]);

    expect(availability).toEqual([true]);
    expect(engine.circles).toHaveLength(1);
    expect(engine.circles[0].center).toEqual([52, 4]);
    expect(engine.circles[0].radius).toBe(100);
    expect(engine.circles[0].options.title).toBe("Home");
    expect(engine.circles[0].options.moveable).toBe(true);
    expect(engine.circles[0].options.resizable).toBe(true);
    expect(engine.draggables).toHaveLength(1);
    expect(engine.draggables[0].location).toEqual([52, 5]);
  });

  it("moves existing handles instead of recreating them", async () => {
    const { el, engine } = await createEditor([HOME, PIN]);

    el.editableLocations = [
      { ...HOME, location: [52.1, 4.1], radius: 250 },
      { ...PIN, location: [52.2, 5.2] },
    ];
    await el.updateComplete;

    expect(engine.editing.addEditableCircle).toHaveBeenCalledOnce();
    expect(engine.circles[0].update).toHaveBeenCalledWith([52.1, 4.1], 250);
    expect(engine.editing.addDraggableMarker).toHaveBeenCalledOnce();
    expect(engine.draggables[0].setLocation).toHaveBeenCalledWith([52.2, 5.2]);
  });

  it("rebuilds a handle whose appearance changed and removes dropped ones", async () => {
    const { el, engine } = await createEditor([HOME, PIN]);

    el.editableLocations = [{ ...HOME, title: "Work" }];
    await el.updateComplete;

    expect(engine.circles[0].remove).toHaveBeenCalledOnce();
    expect(engine.circles).toHaveLength(2);
    expect(engine.circles[1].options.title).toBe("Work");
    expect(engine.draggables[0].remove).toHaveBeenCalledOnce();
  });

  it("forwards moves, resizes, and activation with the location id", async () => {
    const { el, engine } = await createEditor([HOME, PIN]);
    const events: { type: string; detail: unknown }[] = [];
    for (const type of [
      "editable-location-moved",
      "editable-location-resized",
      "editable-location-clicked",
    ]) {
      el.addEventListener(type, (ev) => {
        events.push({ type, detail: (ev as CustomEvent).detail });
      });
    }

    engine.circles[0].options.onMove!([52.1, 4.1]);
    engine.circles[0].options.onResize!(250);
    engine.circles[0].options.onClick!();
    engine.draggables[0].options.onDragEnd!([52.2, 5.2]);
    engine.draggables[0].element.dispatchEvent(new MouseEvent("pointerdown"));
    engine.draggables[0].element.click();
    engine.draggables[0].element.dispatchEvent(
      new KeyboardEvent("keydown", { key: " " })
    );

    expect(events).toEqual([
      {
        type: "editable-location-moved",
        detail: { id: "home", location: [52.1, 4.1] },
      },
      {
        type: "editable-location-resized",
        detail: { id: "home", radius: 250 },
      },
      { type: "editable-location-clicked", detail: { id: "home" } },
      {
        type: "editable-location-moved",
        detail: { id: "pin", location: [52.2, 5.2] },
      },
      { type: "editable-location-clicked", detail: { id: "pin" } },
      { type: "editable-location-clicked", detail: { id: "pin" } },
    ]);
  });

  it("makes markers buttons only when they act on activation", async () => {
    const { el, engine } = await createEditor([
      { ...HOME, activatable: false },
      { ...PIN, activatable: false },
    ]);
    const clicked = vi.fn();
    el.addEventListener("editable-location-clicked", clicked);

    expect(engine.circles[0].options.onClick).toBeUndefined();
    expect((engine.draggables[0].options as any).focusable).toBe(false);
    engine.draggables[0].element.click();
    engine.draggables[0].element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter" })
    );
    expect(clicked).not.toHaveBeenCalled();
  });

  it("relabels its handles when the language changes", async () => {
    const { el, engine } = await createEditor([PIN]);
    expect((engine.draggables[0].options as any).title).toBeUndefined();

    (el as any)._i18n = { localize: (key: string) => `nl:${key}` };
    await el.updateComplete;

    expect(engine.draggables[0].remove).toHaveBeenCalledOnce();
    expect((engine.draggables[1].options as any).title).toBe(
      "nl:ui.components.map.location"
    );
  });

  it("shows locations statically on an engine without editing support", async () => {
    webgl2.supported = false;
    const { el, availability } = await createEditor([HOME, PIN]);

    expect(availability).toEqual([false]);
    // Drawn with the plain viewing primitives: a circle plus two markers
    expect(leafletMap(el)).toBeDefined();
    let layers = 0;
    leafletMap(el).eachLayer(() => {
      layers++;
    });
    expect(layers).toBeGreaterThanOrEqual(3);
  });
});
