import type { HassEntities } from "home-assistant-js-websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/map/ha-map";
import type { HaMap } from "../../../src/components/map/ha-map";

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

// jsdom has no WebGL2, so ha-map runs its Leaflet fallback engine here; the
// Leaflet map underneath is what the fit assertions read.
const leafletMap = (el: HaMap) => (el as any)._engine?.leafletMap;

const createMap = async (
  options: {
    clusterMarkers?: boolean;
    states?: HassEntities;
    entities?: string[];
  } = {}
): Promise<HaMap> => {
  const el = document.createElement("ha-map");
  el.entities = options.entities ?? [
    "device_tracker.paulus",
    "device_tracker.anne_therese",
  ];
  el.clusterMarkers = options.clusterMarkers ?? false;
  (el as any)._states = options.states ?? STATES;
  (el as any)._config = {
    config: { latitude: 52.3731339, longitude: 4.8903147 },
  };
  document.body.appendChild(el);
  await vi.waitUntil(() => leafletMap(el) !== undefined && (el as any)._loaded);
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

    const map = leafletMap(el)!;
    // The map should be fitted to the markers, not zoomed out to the world.
    expect(map.getZoom()).toBeGreaterThanOrEqual(10);
    expect(map.getCenter().lat).toBeCloseTo(52.3745, 2);
    expect(map.getCenter().lng).toBeCloseTo(4.8925, 2);
  });

  it("fits to the zones when they are all the map shows", async () => {
    const el = await createMap({
      states: {
        "zone.work": {
          entity_id: "zone.work",
          state: "0",
          attributes: {
            friendly_name: "Work",
            latitude: 52.3,
            longitude: 4.8,
            radius: 100,
          },
          context: { id: "3", user_id: null, parent_id: null },
          last_changed: "2026-01-01T00:00:00Z",
          last_updated: "2026-01-01T00:00:00Z",
        },
      } as unknown as HassEntities,
      entities: ["zone.work"],
    });
    setMapSize(el, 800, 500);
    fireResizeObservers();
    await el.updateComplete;

    const map = leafletMap(el)!;
    // Centred on the zone, not jumped to the home coordinates
    expect(map.getCenter().lat).toBeCloseTo(52.3, 2);
    expect(map.getCenter().lng).toBeCloseTo(4.8, 2);
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
      const map = leafletMap(el)!;
      expect(map.getZoom()).toBeGreaterThanOrEqual(10);
      expect(map.getCenter().lat).toBeCloseTo(52.3745, 2);
      expect(map.getCenter().lng).toBeCloseTo(4.8925, 2);
    } finally {
      Object.defineProperty(Element.prototype, "clientWidth", originalWidth!);
      Object.defineProperty(Element.prototype, "clientHeight", originalHeight!);
    }
  });

  describe("marker reuse", () => {
    // Two trackers close enough to share one cluster bubble
    const NEARBY = {
      ...STATES,
      "device_tracker.anne_therese": {
        ...STATES["device_tracker.anne_therese"],
        attributes: {
          friendly_name: "Anne Therese",
          latitude: 52.3722,
          longitude: 4.8902,
        },
      },
    } as unknown as HassEntities;

    const withSize = async (create: () => Promise<HaMap>) => {
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
        return await create();
      } finally {
        Object.defineProperty(Element.prototype, "clientWidth", originalWidth!);
        Object.defineProperty(
          Element.prototype,
          "clientHeight",
          originalHeight!
        );
      }
    };

    const marker = (el: HaMap, entityId: string) =>
      el.shadowRoot!.querySelector<HTMLElement>(
        `ha-entity-marker[entity-id="${entityId}"]`
      );

    const shownBubbles = (el: HaMap) =>
      [...el.shadowRoot!.querySelectorAll(".cluster-bubble")].filter(
        (bubble) => bubble.isConnected
      );

    // markercluster keeps the outgoing bubble until its animation ends
    const settledBubble = async (el: HaMap, previous?: Element) => {
      let bubble: Element | undefined;
      await vi.waitFor(() => {
        const bubbles = shownBubbles(el);
        expect(bubbles).toHaveLength(1);
        expect(bubbles[0]).not.toBe(previous);
        bubble = bubbles[0];
      });
      return bubble!;
    };

    it("keeps an entity's marker element across redraws", async () => {
      const el = await createMap();
      const before = marker(el, "device_tracker.paulus")!;
      expect(before.getAttribute("exportparts")).toContain(
        "marker: marker-device_tracker-paulus"
      );

      (el as any)._states = {
        ...STATES,
        "device_tracker.paulus": {
          ...STATES["device_tracker.paulus"],
          attributes: {
            ...STATES["device_tracker.paulus"].attributes,
            friendly_name: "Paulus Moved",
            latitude: 52.4,
          },
        },
      };
      await el.updateComplete;

      const after = marker(el, "device_tracker.paulus")!;
      expect(after).toBe(before);
      expect(after.isConnected).toBe(true);
      expect((after as any).entityName).toBe("PM");
    });

    it("shows up to four avatars, and three with a count beyond that", async () => {
      const el = await createMap({ clusterMarkers: true, states: NEARBY });
      const build = (count: number) =>
        (el as any)._createClusterBubble(
          Array.from({ length: count }, (_, i) => ({
            clusterData: {
              entityId: `person.p${i}`,
              title: `P${i}`,
              label: "P",
            },
          })),
          [52.372, 4.89]
        ).element as HTMLElement;

      const four = build(4);
      expect(four.querySelectorAll("ha-entity-marker")).toHaveLength(4);
      expect(four.querySelector(".more")).toBeNull();

      const five = build(5);
      expect(five.querySelectorAll("ha-entity-marker")).toHaveLength(3);
      expect(five.querySelector(".more")?.textContent).toBe("+2");
    });

    it("reuses a detached avatar and drops its stale trail color", async () => {
      const el = await createMap({ clusterMarkers: true, states: NEARBY });
      const build = () =>
        (el as any)._createClusterBubble(
          [{ clusterData: { entityId: "device_tracker.paulus", label: "P" } }],
          [52.372, 4.89]
        ).element as HTMLElement;

      el.paths = [{ points: [], color: "#ff0000" }];
      const avatar = build().querySelector<HTMLElement>("ha-entity-marker")!;
      expect(avatar.style.getPropertyValue("--ha-marker-border-width")).toBe(
        "2px"
      );

      el.paths = [];
      const rebuilt = build();
      expect(rebuilt.querySelector("ha-entity-marker")).toBe(avatar);
      expect(avatar.style.getPropertyValue("--ha-marker-border-width")).toBe(
        ""
      );

      // An avatar still on screen stays where it is
      document.body.appendChild(rebuilt);
      expect(build().querySelector("ha-entity-marker")).not.toBe(avatar);
    });

    it("makes the avatars of an expanded bubble buttons that open the entity", async () => {
      const el = await createMap({ clusterMarkers: true, states: NEARBY });
      const members = [
        {
          clusterData: {
            entityId: "device_tracker.paulus",
            title: "Paulus",
            label: "P",
          },
        },
      ];
      const build = (expanded: boolean) =>
        (el as any)._createClusterBubble(
          members,
          [52.372, 4.89],
          undefined,
          expanded
        ).element as HTMLElement;

      const expanded = build(true);
      // On the map, where the avatar's own keyboard handling is live
      document.body.appendChild(expanded);
      const avatar = expanded.querySelector<HTMLElement>("ha-entity-marker")!;
      expect(avatar.getAttribute("role")).toBe("button");
      expect(avatar.tabIndex).toBe(0);
      expect(avatar.getAttribute("aria-label")).toBe("Paulus");

      const moreInfo = vi.fn();
      expanded.addEventListener("hass-more-info", moreInfo);
      avatar.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
      expect(moreInfo).toHaveBeenCalledOnce();
      expanded.remove();

      // Back in a closed bubble the same avatar is no longer a button
      expect(build(false).querySelector("ha-entity-marker")).toBe(avatar);
      expect(avatar.hasAttribute("role")).toBe(false);
      expect(avatar.hasAttribute("tabindex")).toBe(false);
    });

    it("keeps avatars in a bubble Leaflet shows again after zooming out", async () => {
      const el = await withSize(() =>
        createMap({ clusterMarkers: true, states: NEARBY })
      );
      const map = leafletMap(el)!;
      map.setView([52.3721, 4.8901], 12, { animate: false });
      const zoomedOut = await settledBubble(el);
      expect(zoomedOut.querySelectorAll("ha-entity-marker")).toHaveLength(2);

      map.setZoom(13, { animate: false });
      const zoomedIn = await settledBubble(el, zoomedOut);
      expect(zoomedIn.querySelectorAll("ha-entity-marker")).toHaveLength(2);

      map.setZoom(12, { animate: false });
      const shownAgain = await settledBubble(el, zoomedIn);
      expect(shownAgain.querySelectorAll("ha-entity-marker")).toHaveLength(2);
    });
  });
});
