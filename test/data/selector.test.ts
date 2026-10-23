import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { DeviceRegistryEntry } from "../../src/data/device/device_registry";
import {
  computeCreateDomains,
  filterSelectorEntities,
  resolveEntityIDs,
} from "../../src/data/selector";
import type { TargetSelector } from "../../src/data/selector";
import type { HomeAssistant } from "../../src/types";

const entity = {
  entity_id: "light.living_room",
  state: "on",
  attributes: {},
} as HassEntity;

const entityRegistry = {
  "light.living_room": {
    device_id: "device_1",
    translation_key: "living_room_light",
  },
} as unknown as HomeAssistant["entities"];

const devices = {
  device_1: {
    id: "device_1",
    manufacturer: "Signify",
    model: "Hue Bulb",
    model_id: "LCT015",
  } as DeviceRegistryEntry,
} as unknown as HomeAssistant["devices"];

describe("filterSelectorEntities device filter", () => {
  it("matches when the nested device manufacturer matches", () => {
    expect(
      filterSelectorEntities(
        { device: { manufacturer: "Signify" } },
        entity,
        undefined,
        entityRegistry,
        devices
      )
    ).toBe(true);
  });

  it("does not match when the nested device manufacturer differs", () => {
    expect(
      filterSelectorEntities(
        { device: { manufacturer: "Sonos" } },
        entity,
        undefined,
        entityRegistry,
        devices
      )
    ).toBe(false);
  });

  it("matches when model and model_id both match", () => {
    expect(
      filterSelectorEntities(
        { device: { model: "Hue Bulb", model_id: "LCT015" } },
        entity,
        undefined,
        entityRegistry,
        devices
      )
    ).toBe(true);
  });

  it("does not match when one of model or model_id differs", () => {
    expect(
      filterSelectorEntities(
        { device: { model: "Hue Bulb", model_id: "OTHER" } },
        entity,
        undefined,
        entityRegistry,
        devices
      )
    ).toBe(false);
  });

  it("matches the device integration via the lookup", () => {
    expect(
      filterSelectorEntities(
        { device: { integration: "hue" } },
        entity,
        undefined,
        entityRegistry,
        devices,
        { device_1: new Set(["hue"]) }
      )
    ).toBe(true);
  });

  it("does not match a device integration that is absent from the lookup", () => {
    expect(
      filterSelectorEntities(
        { device: { integration: "zha" } },
        entity,
        undefined,
        entityRegistry,
        devices,
        { device_1: new Set(["hue"]) }
      )
    ).toBe(false);
  });

  it("does not match when the entity has no underlying device", () => {
    expect(
      filterSelectorEntities(
        { device: { manufacturer: "Signify" } },
        entity,
        undefined,
        {} as HomeAssistant["entities"],
        devices
      )
    ).toBe(false);
  });

  it("combines device conditions with other entity conditions (AND)", () => {
    expect(
      filterSelectorEntities(
        { domain: "light", device: { manufacturer: "Signify" } },
        entity,
        undefined,
        entityRegistry,
        devices
      )
    ).toBe(true);

    expect(
      filterSelectorEntities(
        { domain: "switch", device: { manufacturer: "Signify" } },
        entity,
        undefined,
        entityRegistry,
        devices
      )
    ).toBe(false);
  });
});

describe("filterSelectorEntities translation key filter", () => {
  it("matches when the registry translation key matches", () => {
    expect(
      filterSelectorEntities(
        { translation_key: "living_room_light" },
        entity,
        undefined,
        entityRegistry
      )
    ).toBe(true);
  });

  it("matches when the translation key is in the list", () => {
    expect(
      filterSelectorEntities(
        { translation_key: ["kitchen_light", "living_room_light"] },
        entity,
        undefined,
        entityRegistry
      )
    ).toBe(true);
  });

  it("does not match when the translation key is not in the list", () => {
    expect(
      filterSelectorEntities(
        { translation_key: ["kitchen_light", "hallway_light"] },
        entity,
        undefined,
        entityRegistry
      )
    ).toBe(false);
  });

  it("does not match a different translation key", () => {
    expect(
      filterSelectorEntities(
        { translation_key: "kitchen_light" },
        entity,
        undefined,
        entityRegistry
      )
    ).toBe(false);
  });

  it("does not match an entity without a registry entry", () => {
    expect(
      filterSelectorEntities(
        { translation_key: "living_room_light" },
        entity,
        undefined,
        {} as HomeAssistant["entities"]
      )
    ).toBe(false);
  });

  it("does not match a registry entry without a translation key", () => {
    expect(
      filterSelectorEntities(
        { translation_key: "living_room_light" },
        entity,
        undefined,
        { "light.living_room": {} } as unknown as HomeAssistant["entities"]
      )
    ).toBe(false);
  });

  it("combines the translation key with other conditions (AND)", () => {
    expect(
      filterSelectorEntities(
        { domain: "light", translation_key: "living_room_light" },
        entity,
        undefined,
        entityRegistry
      )
    ).toBe(true);

    expect(
      filterSelectorEntities(
        { domain: "switch", translation_key: "living_room_light" },
        entity,
        undefined,
        entityRegistry
      )
    ).toBe(false);
  });

  it("matches every entity when the translation key list is empty", () => {
    expect(
      filterSelectorEntities(
        { translation_key: [] },
        entity,
        undefined,
        entityRegistry
      )
    ).toBe(true);
  });

  it("matches without a registry entry when the translation key list is empty", () => {
    expect(
      filterSelectorEntities(
        { translation_key: [] },
        entity,
        undefined,
        {} as HomeAssistant["entities"]
      )
    ).toBe(true);
  });

  it("does not match when the translation key filter is an empty string", () => {
    expect(
      filterSelectorEntities(
        { translation_key: "" },
        entity,
        undefined,
        entityRegistry
      )
    ).toBe(false);
  });
});

describe("computeCreateDomains translation key filter", () => {
  it("offers helper creation for a domain only filter", () => {
    expect(
      computeCreateDomains({ entity: { filter: { domain: "counter" } } })
    ).toEqual(["counter"]);
  });

  it("skips helper creation when the filter carries a translation key", () => {
    expect(
      computeCreateDomains({
        entity: { filter: { domain: "counter", translation_key: "epex" } },
      })
    ).toEqual([]);
  });

  it("keeps helper creation for an empty translation key list", () => {
    expect(
      computeCreateDomains({
        entity: { filter: { domain: "counter", translation_key: [] } },
      })
    ).toEqual(["counter"]);
  });
});

describe("resolveEntityIDs", () => {
  const areaHass = {
    states: {
      "light.kitchen": { entity_id: "light.kitchen", state: "on" },
      "sensor.kitchen_hub_temp": {
        entity_id: "sensor.kitchen_hub_temp",
        state: "20",
      },
      "sensor.hallway_probe": { entity_id: "sensor.hallway_probe", state: "5" },
    },
    entities: {
      "light.kitchen": { entity_id: "light.kitchen", device_id: "hub" },
      "sensor.kitchen_hub_temp": {
        entity_id: "sensor.kitchen_hub_temp",
        device_id: "hub",
        translation_key: "epex_current_hour",
      },
      "sensor.hallway_probe": {
        entity_id: "sensor.hallway_probe",
        device_id: "hub",
        area_id: "hallway",
      },
    },
    devices: { hub: { id: "hub", area_id: "kitchen" } },
    areas: { kitchen: { area_id: "kitchen" }, hallway: { area_id: "hallway" } },
  } as unknown as HomeAssistant;

  const resolve = (target, targetSelector?: TargetSelector) =>
    resolveEntityIDs(
      areaHass,
      target,
      areaHass.entities,
      areaHass.devices,
      areaHass.areas,
      targetSelector
    ).sort();

  it("skips entities of an area device that are assigned to another area", () => {
    expect(resolve({ area_id: "kitchen" })).toEqual([
      "light.kitchen",
      "sensor.kitchen_hub_temp",
    ]);
  });

  it("keeps every entity of a directly targeted device", () => {
    expect(resolve({ device_id: "hub" })).toEqual([
      "light.kitchen",
      "sensor.hallway_probe",
      "sensor.kitchen_hub_temp",
    ]);
  });

  it("keeps the entity when its own area is targeted as well", () => {
    expect(resolve({ area_id: ["kitchen", "hallway"] })).toEqual([
      "light.kitchen",
      "sensor.hallway_probe",
      "sensor.kitchen_hub_temp",
    ]);
  });

  it("resolves an area through a device whose entity matches a translation key filter", () => {
    expect(
      resolve(
        { area_id: "kitchen" },
        {
          target: {
            entity: [
              { domain: "sensor", translation_key: "epex_current_hour" },
            ],
          },
        }
      )
    ).toEqual(["sensor.kitchen_hub_temp"]);
  });

  // Excludes are global: resolved like a target and taken out of everything
  // the target includes, so logbook, history and state selectors only show
  // what the action or trigger actually acts on.
  describe("exclude", () => {
    it("takes an excluded entity out of an area", () => {
      expect(
        resolve({
          area_id: "kitchen",
          exclude: { entity_id: "light.kitchen" },
        })
      ).toEqual(["sensor.kitchen_hub_temp"]);
    });

    it("takes an excluded area out of a device", () => {
      expect(
        resolve({ device_id: "hub", exclude: { area_id: "hallway" } })
      ).toEqual(["light.kitchen", "sensor.kitchen_hub_temp"]);
    });

    it("takes an excluded device out of every included target", () => {
      expect(
        resolve({
          area_id: ["kitchen", "hallway"],
          exclude: { device_id: ["hub"] },
        })
      ).toEqual([]);
    });

    it("wins over an explicit include of the same entity", () => {
      expect(
        resolve({
          entity_id: ["light.kitchen", "sensor.hallway_probe"],
          exclude: { entity_id: "light.kitchen" },
        })
      ).toEqual(["sensor.hallway_probe"]);
    });

    it("leaves the target alone when the exclude matches nothing", () => {
      expect(
        resolve({ area_id: "kitchen", exclude: { area_id: "deleted_area" } })
      ).toEqual(["light.kitchen", "sensor.kitchen_hub_temp"]);
    });

    it("resolves nothing for an exclude on its own", () => {
      expect(resolve({ exclude: { area_id: "kitchen" } })).toEqual([]);
    });
  });
});
