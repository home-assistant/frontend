import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ENTITY_NAME } from "../../../../../src/common/entity/compute_entity_name_display";
import { computeLovelaceEntityName } from "../../../../../src/panels/lovelace/common/entity/compute-lovelace-entity-name";
import type { HomeAssistant } from "../../../../../src/types";
import { mockStateObj } from "../../../../common/entity/context/context-mock";

const createMockHass = (
  mockFormatEntityName: ReturnType<typeof vi.fn>
): HomeAssistant =>
  ({
    formatEntityName: mockFormatEntityName,
  }) as unknown as HomeAssistant;

describe("computeLovelaceEntityName", () => {
  it("returns the string directly when nameConfig is a string", () => {
    const mockFormatEntityName = vi.fn();
    const hass = createMockHass(mockFormatEntityName);
    const stateObj = mockStateObj({ entity_id: "light.kitchen" });

    const result = computeLovelaceEntityName(hass, stateObj, "Custom Name");

    expect(result).toBe("Custom Name");
    expect(mockFormatEntityName).not.toHaveBeenCalled();
  });

  it("returns empty string when nameConfig is empty string", () => {
    const mockFormatEntityName = vi.fn();
    const hass = createMockHass(mockFormatEntityName);
    const stateObj = mockStateObj({ entity_id: "light.kitchen" });

    const result = computeLovelaceEntityName(hass, stateObj, "");

    expect(result).toBe("");
    expect(mockFormatEntityName).not.toHaveBeenCalled();
  });

  it("calls formatEntityName with DEFAULT_ENTITY_NAME when nameConfig is undefined", () => {
    const mockFormatEntityName = vi.fn(() => "Formatted Name");
    const hass = createMockHass(mockFormatEntityName);
    const stateObj = mockStateObj({ entity_id: "light.kitchen" });

    const result = computeLovelaceEntityName(hass, stateObj, undefined);

    expect(result).toBe("Formatted Name");
    expect(mockFormatEntityName).toHaveBeenCalledTimes(1);
    expect(mockFormatEntityName).toHaveBeenCalledWith(
      stateObj,
      DEFAULT_ENTITY_NAME
    );
  });

  it("calls formatEntityName with EntityNameItem config", () => {
    const mockFormatEntityName = vi.fn(() => "Formatted Name");
    const hass = createMockHass(mockFormatEntityName);
    const stateObj = mockStateObj({ entity_id: "light.bedroom" });
    const nameConfig = { type: "device" as const };

    const result = computeLovelaceEntityName(hass, stateObj, nameConfig);

    expect(result).toBe("Formatted Name");
    expect(mockFormatEntityName).toHaveBeenCalledTimes(1);
    expect(mockFormatEntityName).toHaveBeenCalledWith(stateObj, nameConfig);
  });

  it("calls formatEntityName with array of EntityNameItems", () => {
    const mockFormatEntityName = vi.fn(() => "Formatted Name");
    const hass = createMockHass(mockFormatEntityName);
    const stateObj = mockStateObj({ entity_id: "light.kitchen" });
    const nameConfig = [
      { type: "device" as const },
      { type: "entity" as const },
    ];

    const result = computeLovelaceEntityName(hass, stateObj, nameConfig);

    expect(result).toBe("Formatted Name");
    expect(mockFormatEntityName).toHaveBeenCalledTimes(1);
    expect(mockFormatEntityName).toHaveBeenCalledWith(stateObj, nameConfig);
  });
});
