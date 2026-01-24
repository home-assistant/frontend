import { describe, it, expect } from "vitest";
import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../../../../src/panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../../../src/types";

const createMockHass = (states: Record<string, { state: string }> = {}) =>
  ({
    states,
    user: { id: "user1" },
  }) as unknown as HomeAssistant;

describe("validateConditionalConfig", () => {
  describe("state condition validation", () => {
    it("should return true for valid state condition", () => {
      const conditions = [
        { condition: "state", entity: "sensor.test", state: "on" },
      ] as any;
      expect(validateConditionalConfig(conditions)).toBe(true);
    });

    it("should return false for state condition without state or state_not", () => {
      const conditions = [{ condition: "state", entity: "sensor.test" }] as any;
      expect(validateConditionalConfig(conditions)).toBe(false);
    });
  });

  describe("numeric_state condition validation", () => {
    it("should return true for valid numeric_state condition", () => {
      const conditions = [
        { condition: "numeric_state", entity: "sensor.test", above: 0 },
      ] as any;
      expect(validateConditionalConfig(conditions)).toBe(true);
    });
  });
});

describe("checkConditionsMet", () => {
  describe("state condition evaluation", () => {
    it("should return true when state matches", () => {
      const hass = createMockHass({
        "sensor.test": { state: "on" },
      });
      const conditions = [
        { condition: "state", entity: "sensor.test", state: "on" },
      ] as any;
      expect(checkConditionsMet(conditions, hass)).toBe(true);
    });

    it("should return false when state does not match", () => {
      const hass = createMockHass({
        "sensor.test": { state: "off" },
      });
      const conditions = [
        { condition: "state", entity: "sensor.test", state: "on" },
      ] as any;
      expect(checkConditionsMet(conditions, hass)).toBe(false);
    });

    it("should return false for condition without state or state_not", () => {
      const hass = createMockHass({
        "sensor.test": { state: "on" },
      });
      const conditions = [{ condition: "state", entity: "sensor.test" }] as any;
      expect(checkConditionsMet(conditions, hass)).toBe(false);
    });

    it("should not crash with invalid condition type", () => {
      const hass = createMockHass({
        "sensor.test": { state: "5" },
      });
      const conditions = [
        { condition: "numeric", entity: "sensor.test", above: 0 },
      ] as any;
      // Should not throw - this was the bug
      expect(() => checkConditionsMet(conditions, hass)).not.toThrow();
      expect(checkConditionsMet(conditions, hass)).toBe(false);
    });
  });

  describe("numeric_state condition evaluation", () => {
    it("should return true when value is above threshold", () => {
      const hass = createMockHass({
        "sensor.test": { state: "5" },
      });
      const conditions = [
        { condition: "numeric_state", entity: "sensor.test", above: 0 },
      ] as any;
      expect(checkConditionsMet(conditions, hass)).toBe(true);
    });
  });

  describe("legacy conditions", () => {
    it("should handle legacy state condition", () => {
      const hass = createMockHass({
        "sensor.test": { state: "on" },
      });
      const conditions = [{ entity: "sensor.test", state: "on" }] as any;
      expect(checkConditionsMet(conditions, hass)).toBe(true);
    });

    it("should return false for legacy condition without state", () => {
      const hass = createMockHass({
        "sensor.test": { state: "on" },
      });
      const conditions = [{ entity: "sensor.test" }] as any;
      expect(checkConditionsMet(conditions, hass)).toBe(false);
    });
  });
});
