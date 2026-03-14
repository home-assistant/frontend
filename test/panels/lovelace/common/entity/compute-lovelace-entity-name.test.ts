import { describe, expect, it, vi } from "vitest";
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

  it("return state name when nameConfig is empty string", () => {
    const mockFormatEntityName = vi.fn();
    const hass = createMockHass(mockFormatEntityName);
    const stateObj = mockStateObj({
      entity_id: "light.kitchen",
      attributes: { friendly_name: "Kitchen Light" },
    });

    const result = computeLovelaceEntityName(hass, stateObj, "");

    expect(result).toBe("Kitchen Light");
    expect(mockFormatEntityName).not.toHaveBeenCalled();
  });

  it("return state name when nameConfig is undefined", () => {
    const mockFormatEntityName = vi.fn(() => "Formatted Name");
    const hass = createMockHass(mockFormatEntityName);
    const stateObj = mockStateObj({
      entity_id: "light.kitchen",
      attributes: { friendly_name: "Kitchen Light" },
    });

    const result = computeLovelaceEntityName(hass, stateObj, undefined);

    expect(result).toBe("Kitchen Light");
    expect(mockFormatEntityName).not.toHaveBeenCalled();
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

  describe("when stateObj is undefined", () => {
    it("returns empty string when nameConfig is undefined", () => {
      const mockFormatEntityName = vi.fn();
      const hass = createMockHass(mockFormatEntityName);

      const result = computeLovelaceEntityName(hass, undefined, undefined);

      expect(result).toBe("");
      expect(mockFormatEntityName).not.toHaveBeenCalled();
    });

    it("returns text from single text EntityNameItem", () => {
      const mockFormatEntityName = vi.fn();
      const hass = createMockHass(mockFormatEntityName);
      const nameConfig = { type: "text" as const, text: "Custom Text" };

      const result = computeLovelaceEntityName(hass, undefined, nameConfig);

      expect(result).toBe("Custom Text");
      expect(mockFormatEntityName).not.toHaveBeenCalled();
    });

    it("returns joined text from multiple text EntityNameItems", () => {
      const mockFormatEntityName = vi.fn();
      const hass = createMockHass(mockFormatEntityName);
      const nameConfig = [
        { type: "text" as const, text: "First" },
        { type: "text" as const, text: "Second" },
      ];

      const result = computeLovelaceEntityName(hass, undefined, nameConfig);

      expect(result).toBe("First Second");
      expect(mockFormatEntityName).not.toHaveBeenCalled();
    });

    it("returns only text items when mixed with non-text items", () => {
      const mockFormatEntityName = vi.fn();
      const hass = createMockHass(mockFormatEntityName);
      const nameConfig = [
        { type: "text" as const, text: "Prefix" },
        { type: "device" as const },
        { type: "text" as const, text: "Suffix" },
        { type: "entity" as const },
      ];

      const result = computeLovelaceEntityName(hass, undefined, nameConfig);

      expect(result).toBe("Prefix Suffix");
      expect(mockFormatEntityName).not.toHaveBeenCalled();
    });

    it("returns empty string when no text items in config", () => {
      const mockFormatEntityName = vi.fn();
      const hass = createMockHass(mockFormatEntityName);
      const nameConfig = [
        { type: "device" as const },
        { type: "entity" as const },
      ];

      const result = computeLovelaceEntityName(hass, undefined, nameConfig);

      expect(result).toBe("");
      expect(mockFormatEntityName).not.toHaveBeenCalled();
    });
  });
});
