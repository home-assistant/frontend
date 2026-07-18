import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { DeviceRegistryEntry } from "../../src/data/device/device_registry";
import { filterSelectorEntities } from "../../src/data/selector";
import type { HomeAssistant } from "../../src/types";

const entity = {
  entity_id: "light.living_room",
  state: "on",
  attributes: {},
} as HassEntity;

const entityRegistry = {
  "light.living_room": { device_id: "device_1" },
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
