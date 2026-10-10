import { describe, expect, it, vi } from "vitest";
import {
  computeEntityEntryName,
  computeEntityName,
} from "../../../src/common/entity/compute_entity_name";
import * as computeStateNameModule from "../../../src/common/entity/compute_state_name";
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
    } as unknown as HomeAssistant;
    expect(computeEntityName(stateObj, hass.entities)).toBe("Kitchen Light");
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
      states: {
        "light.kitchen": stateObj,
      },
    } as unknown as HomeAssistant;
    expect(computeEntityName(stateObj, hass.entities)).toBe("Ceiling Light");
  });
});

describe("computeEntityEntryName", () => {
  it("returns entry.name if no device", () => {
    const entry = mockEntity({
      entity_id: "light.kitchen",
      name: "Ceiling Light",
    });
    expect(computeEntityEntryName(entry)).toBe("Ceiling Light");
  });

  it("falls back to state name if no name and no device", () => {
    vi.spyOn(computeStateNameModule, "computeStateName").mockReturnValue(
      "Fallback Name"
    );
    const entry = mockEntity({ entity_id: "light.kitchen" });
    const stateObj = mockStateObj({ entity_id: "light.kitchen" });
    expect(computeEntityEntryName(entry, stateObj)).toBe("Fallback Name");
    vi.restoreAllMocks();
  });

  it("returns original_name if present", () => {
    const entry = mockEntityEntry({
      entity_id: "light.kitchen",
      original_name: "Old Name",
    });
    expect(computeEntityEntryName(entry)).toBe("Old Name");
  });

  it("uses the device name for an explicitly empty name instead of the integration name", () => {
    const entry = mockEntityEntry({
      device_id: "dev1",
      name: "",
      original_name: "Temperature",
    });

    expect(computeEntityEntryName(entry)).toBeUndefined();
    expect(computeEntityEntryName({ ...entry, name: null })).toBe(
      "Temperature"
    );
  });

  it("returns undefined if no name, original_name, or device", () => {
    const entry = mockEntity({ entity_id: "light.kitchen" });
    expect(computeEntityEntryName(entry)).toBeUndefined();
  });

  it("handles entities with numeric original_name (real bug from issue #25363)", () => {
    const entry = {
      entity_id: "sensor.texas_instruments_cc2652_2",
      name: null, // null name
      original_name: 2, // Number instead of string! This caused the original crash
      device_id: "dev1",
      has_entity_name: true,
    };

    // Should not throw an error and should return the stringified number
    expect(() => computeEntityEntryName(entry as any)).not.toThrow();
    expect(computeEntityEntryName(entry as any)).toBe("2");
  });

  it("returns undefined when entity has device but no name or original_name", () => {
    const entry = {
      entity_id: "sensor.kitchen_sensor",
      // No name property
      // No original_name property
      device_id: "dev1",
    };

    // Should return undefined to maintain function contract
    expect(computeEntityEntryName(entry as any)).toBeUndefined();
  });
});
