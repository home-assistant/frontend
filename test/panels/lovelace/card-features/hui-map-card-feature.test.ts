import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import {
  findRelatedLocationEntity,
  HuiMapCardFeature,
  supportsMapCardFeature,
  supportsMapCardFeatureFromState,
} from "../../../../src/panels/lovelace/card-features/hui-map-card-feature";
import {
  computeCardFeatureLayout,
  computeCardFeatureRows,
} from "../../../../src/panels/lovelace/card-features/common/feature-layout";
import type { EntityRegistryDisplayEntry } from "../../../../src/data/entity/entity_registry";
import type { HomeAssistant } from "../../../../src/types";

const entity = (
  entityId: string,
  attributes: Record<string, unknown> = {}
): HassEntity =>
  ({
    entity_id: entityId,
    state: "ok",
    attributes,
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

const regEntry = (
  entityId: string,
  deviceId?: string
): EntityRegistryDisplayEntry => ({
  entity_id: entityId,
  device_id: deviceId,
  labels: [],
});

const hassWith = (
  entities: HassEntity[],
  registryEntries: Record<string, EntityRegistryDisplayEntry> = {}
): HomeAssistant =>
  ({
    states: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
    entities: registryEntries,
  }) as unknown as HomeAssistant;

describe("supportsMapCardFeature", () => {
  it("supports a lawn mower entity with coordinates directly", () => {
    const stateObj = entity("lawn_mower.mower", {
      latitude: 51.5074,
      longitude: -0.1278,
    });
    const hass = hassWith([stateObj]);
    expect(
      supportsMapCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(true);
  });

  it("supports a lawn mower entity whose device has a device_tracker with coordinates", () => {
    const mowerState = entity("lawn_mower.hugo");
    const trackerState = entity("device_tracker.hugo", {
      latitude: 51.5074,
      longitude: -0.1278,
    });
    const registry: Record<string, EntityRegistryDisplayEntry> = {
      "lawn_mower.hugo": regEntry("lawn_mower.hugo", "device_hugo_123"),
      "device_tracker.hugo": regEntry("device_tracker.hugo", "device_hugo_123"),
    };
    const hass = hassWith([mowerState, trackerState], registry);
    expect(
      supportsMapCardFeature(hass, { entity_id: mowerState.entity_id })
    ).toBe(true);
  });

  it("does not support a lawn mower entity without coordinates and without related tracker", () => {
    const stateObj = entity("lawn_mower.mower");
    const hass = hassWith([stateObj]);
    expect(
      supportsMapCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("supports a device tracker with coordinates", () => {
    const stateObj = entity("device_tracker.phone", {
      latitude: 40.7128,
      longitude: -74.006,
    });
    const hass = hassWith([stateObj]);
    expect(
      supportsMapCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(true);
  });

  it("supports a person in a zone with coordinates", () => {
    const zoneObj = entity("zone.home", {
      latitude: 48.8566,
      longitude: 2.3522,
    });
    const personObj = entity("person.john", {
      in_zones: ["zone.home"],
    });
    const hass = hassWith([zoneObj, personObj]);
    expect(
      supportsMapCardFeature(hass, { entity_id: personObj.entity_id })
    ).toBe(true);
  });

  it("does not support an entity without coordinates", () => {
    const stateObj = entity("switch.garden_lights");
    const hass = hassWith([stateObj]);
    expect(
      supportsMapCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("does not support a context with no entity_id", () => {
    const hass = hassWith([]);
    expect(supportsMapCardFeature(hass, {})).toBe(false);
  });
});

describe("findRelatedLocationEntity", () => {
  it("finds location entity on the same device", () => {
    const states = {
      "lawn_mower.hugo": entity("lawn_mower.hugo"),
      "device_tracker.hugo": entity("device_tracker.hugo", {
        latitude: 10,
        longitude: 20,
      }),
    };
    const registry: Record<string, EntityRegistryDisplayEntry> = {
      "lawn_mower.hugo": regEntry("lawn_mower.hugo", "device_hugo_123"),
      "device_tracker.hugo": regEntry("device_tracker.hugo", "device_hugo_123"),
    };
    expect(findRelatedLocationEntity(registry, states, "lawn_mower.hugo")).toBe(
      "device_tracker.hugo"
    );
  });

  it("returns undefined when no device_id or no matching entity with coordinates", () => {
    const states = {
      "lawn_mower.hugo": entity("lawn_mower.hugo"),
    };
    const registry: Record<string, EntityRegistryDisplayEntry> = {
      "lawn_mower.hugo": regEntry("lawn_mower.hugo"),
    };
    expect(
      findRelatedLocationEntity(registry, states, "lawn_mower.hugo")
    ).toBeUndefined();
  });
});

describe("supportsMapCardFeatureFromState", () => {
  it("returns true when coordinates are present", () => {
    const stateObj = entity("lawn_mower.robomow", {
      latitude: 10,
      longitude: 20,
    });
    expect(supportsMapCardFeatureFromState(stateObj, {})).toBe(true);
  });

  it("returns false when coordinates are missing", () => {
    const stateObj = entity("lawn_mower.robomow");
    expect(supportsMapCardFeatureFromState(stateObj, {})).toBe(false);
  });
});

describe("HuiMapCardFeature.getStubConfig", () => {
  it("prefills entity_id when context entity has coordinates", async () => {
    const stateObj = entity("lawn_mower.mower", {
      latitude: 51.5074,
      longitude: -0.1278,
    });
    const hass = hassWith([stateObj]);
    const config = await HuiMapCardFeature.getStubConfig(hass, {
      entity_id: "lawn_mower.mower",
    });
    expect(config).toEqual({
      type: "map",
      entity_id: "lawn_mower.mower",
      rows: 3,
    });
  });

  it("prefills related location entity from the same device", async () => {
    const mowerState = entity("lawn_mower.hugo");
    const trackerState = entity("device_tracker.hugo", {
      latitude: 51.5074,
      longitude: -0.1278,
    });
    const registry: Record<string, EntityRegistryDisplayEntry> = {
      "lawn_mower.hugo": regEntry("lawn_mower.hugo", "device_hugo_123"),
      "device_tracker.hugo": regEntry("device_tracker.hugo", "device_hugo_123"),
    };
    const hass = hassWith([mowerState, trackerState], registry);
    const config = await HuiMapCardFeature.getStubConfig(hass, {
      entity_id: "lawn_mower.hugo",
    });
    expect(config).toEqual({
      type: "map",
      entity_id: "device_tracker.hugo",
      rows: 3,
    });
  });

  it("returns default rows when no context entity is provided", async () => {
    const hass = hassWith([]);
    const config = await HuiMapCardFeature.getStubConfig(hass, {});
    expect(config).toEqual({
      type: "map",
      rows: 3,
    });
  });
});

describe("computeCardFeatureLayout with map", () => {
  it("places map inline when position is inline", () => {
    const layout = computeCardFeatureLayout([{ type: "map" }], "inline");
    expect(layout).toEqual({
      inline: [{ type: "map" }],
      below: [],
      columns: 0,
    });
  });

  it("places first feature inline and map below when map is second", () => {
    const layout = computeCardFeatureLayout(
      [{ type: "target-temperature" }, { type: "map" }],
      "inline"
    );
    expect(layout).toEqual({
      inline: [{ type: "target-temperature" }],
      below: [{ type: "map" }],
      columns: 1,
    });
  });

  it("places map inline and remaining features below in columns", () => {
    const layout = computeCardFeatureLayout(
      [
        { type: "map" },
        { type: "target-temperature" },
        { type: "lawn-mower-commands" },
      ],
      "inline"
    );
    expect(layout).toEqual({
      inline: [{ type: "map" }],
      below: [{ type: "target-temperature" }, { type: "lawn-mower-commands" }],
      columns: 2,
    });
  });
});

describe("computeCardFeatureRows with map rows", () => {
  it("respects custom rows and enforces minimum of 2 rows", () => {
    expect(computeCardFeatureRows([{ type: "map", rows: 1 }], "bottom")).toBe(
      2
    );
    expect(computeCardFeatureRows([{ type: "map", rows: 2 }], "bottom")).toBe(
      2
    );
    expect(computeCardFeatureRows([{ type: "map", rows: 4 }], "bottom")).toBe(
      4
    );
    expect(
      computeCardFeatureRows(
        [{ type: "target-temperature" }, { type: "map", rows: 4 }],
        "bottom"
      )
    ).toBe(5);
  });

  it("calculates correct rows for map in inline mode", () => {
    expect(computeCardFeatureRows([{ type: "map" }], "inline")).toBe(1);
    expect(computeCardFeatureRows([{ type: "map", rows: 3 }], "inline")).toBe(
      2
    );
    expect(
      computeCardFeatureRows(
        [{ type: "map" }, { type: "target-temperature" }],
        "inline"
      )
    ).toBe(2);
    expect(
      computeCardFeatureRows(
        [
          { type: "map", rows: 3 },
          { type: "target-temperature" },
          { type: "lawn-mower-commands" },
        ],
        "inline"
      )
    ).toBe(3);
    expect(
      computeCardFeatureRows(
        [
          { type: "target-temperature" },
          { type: "map", rows: 3 },
          { type: "lawn-mower-commands" },
        ],
        "inline"
      )
    ).toBe(3);
  });

  it("handles undefined and empty features in inline mode", () => {
    expect(computeCardFeatureLayout(undefined, "inline")).toEqual({
      inline: [],
      below: [],
      columns: 0,
    });
    expect(computeCardFeatureLayout([], "inline")).toEqual({
      inline: [],
      below: [],
      columns: 0,
    });
  });
});
