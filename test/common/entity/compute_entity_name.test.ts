import { describe, expect, it, vi } from "vitest";
import * as computeDeviceNameModule from "../../../src/common/entity/compute_device_name";
import {
  computeEntityEntryName,
  computeEntityName,
} from "../../../src/common/entity/compute_entity_name";
import * as computeStateNameModule from "../../../src/common/entity/compute_state_name";
import * as stripPrefixModule from "../../../src/common/entity/strip_prefix_from_entity_name";
import type { HomeAssistant } from "../../../src/types";
import {
  mockEntity,
  mockEntityEntry,
  mockStateObj,
} from "./context/context-mock";

describe("computeEntityName", () => {
  it("returns state name if entity not in registry", () => {
    vi.spyOn(computeStateNameModule, "computeStateName").mockReturnValue(
      "Kitchen Light"
    );
    const stateObj = mockStateObj({
      entity_id: "light.kitchen",
      attributes: { friendly_name: "Kitchen Light" },
      state: "on",
    });
    const hass = {
      entities: {},
      devices: {},
    } as unknown as HomeAssistant;
    expect(computeEntityName(stateObj, hass.entities, hass.devices)).toBe(
      "Kitchen Light"
    );
    vi.restoreAllMocks();
  });

  it("returns entity entry name if present", () => {
    const stateObj = mockStateObj({
      entity_id: "light.kitchen",
      attributes: {},
      state: "on",
    });
    const hass = {
      entities: {
        "light.kitchen": {
          entity_id: "light.kitchen",
          name: "Ceiling Light",
          labels: [],
        },
      },
      devices: {},
      states: {
        "light.kitchen": stateObj,
      },
    } as unknown as HomeAssistant;
    expect(computeEntityName(stateObj, hass.entities, hass.devices)).toBe(
      "Ceiling Light"
    );
  });
});

describe("computeEntityEntryName", () => {
  it("returns entry.name if no device", () => {
    const entry = mockEntity({
      entity_id: "light.kitchen",
      name: "Ceiling Light",
    });
    const hass = { devices: {}, states: {} };
    expect(computeEntityEntryName(entry, hass.devices)).toBe("Ceiling Light");
  });

  it("returns device-stripped name if device present", () => {
    vi.spyOn(computeDeviceNameModule, "computeDeviceName").mockReturnValue(
      "Kitchen"
    );
    vi.spyOn(stripPrefixModule, "stripPrefixFromEntityName").mockImplementation(
      (name, prefix) => name.replace(prefix + " ", "")
    );
    const entry = mockEntity({
      entity_id: "light.kitchen",
      name: "Kitchen Light",
      device_id: "dev1",
    });
    const hass = {
      devices: { dev1: {} },
      states: {},
    } as unknown as HomeAssistant;
    expect(computeEntityEntryName(entry, hass.devices)).toBe("Light");
    vi.restoreAllMocks();
  });

  it("returns undefined if device name equals entity name", () => {
    vi.spyOn(computeDeviceNameModule, "computeDeviceName").mockReturnValue(
      "Kitchen Light"
    );
    const entry = mockEntity({
      entity_id: "light.kitchen",
      name: "Kitchen Light",
      device_id: "dev1",
    });
    const hass = {
      devices: { dev1: {} },
      states: {},
    } as unknown as HomeAssistant;
    expect(computeEntityEntryName(entry, hass.devices)).toBeUndefined();
    vi.restoreAllMocks();
  });

  it("falls back to state name if no name and no device", () => {
    vi.spyOn(computeStateNameModule, "computeStateName").mockReturnValue(
      "Fallback Name"
    );
    const entry = mockEntity({ entity_id: "light.kitchen" });
    const hass = {
      devices: {},
    } as unknown as HomeAssistant;
    const stateObj = mockStateObj({ entity_id: "light.kitchen" });
    expect(computeEntityEntryName(entry, hass.devices, stateObj)).toBe(
      "Fallback Name"
    );
    vi.restoreAllMocks();
  });

  it("returns original_name if present", () => {
    const entry = mockEntityEntry({
      entity_id: "light.kitchen",
      original_name: "Old Name",
    });
    const hass = {
      devices: {},
      states: {},
    } as unknown as HomeAssistant;
    expect(computeEntityEntryName(entry, hass.devices)).toBe("Old Name");
  });

  it("returns undefined if no name, original_name, or device", () => {
    const entry = mockEntity({ entity_id: "light.kitchen" });
    const hass = {
      devices: {},
      states: {},
    } as unknown as HomeAssistant;
    expect(computeEntityEntryName(entry, hass.devices)).toBeUndefined();
  });
});
