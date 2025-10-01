import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../../../../src/panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../../../src/types";

// Mock window.location.hash
const originalLocation = window.location;

describe("validate-condition", () => {
  beforeEach(() => {
    // Mock window.location with a proper type
    delete window.location;
    // Create a minimal mock that matches the Location interface
    window.location = {
      ...originalLocation,
      hash: "",
      assign: originalLocation.assign.bind(originalLocation),
      reload: originalLocation.reload.bind(originalLocation),
      replace: originalLocation.replace.bind(originalLocation),
      toString: originalLocation.toString.bind(originalLocation),
    } as Location;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe("url_hash condition", () => {
    it("should return true when current hash matches the configured hash", () => {
      window.location.hash = "#dashboard";

      const condition = {
        condition: "url_hash" as const,
        hash: "dashboard",
      };

      const hass = {} as HomeAssistant;

      expect(checkConditionsMet([condition], hass)).toBe(true);
    });

    it("should return false when current hash does not match the configured hash", () => {
      window.location.hash = "#other";

      const condition = {
        condition: "url_hash" as const,
        hash: "dashboard",
      };

      const hass = {} as HomeAssistant;

      expect(checkConditionsMet([condition], hass)).toBe(false);
    });

    it("should return false when no hash is configured", () => {
      window.location.hash = "#dashboard";

      const condition = {
        condition: "url_hash" as const,
        hash: "",
      };

      const hass = {} as HomeAssistant;

      expect(checkConditionsMet([condition], hass)).toBe(false);
    });

    it("should return false when hash is undefined", () => {
      window.location.hash = "#dashboard";

      const condition = {
        condition: "url_hash" as const,
        hash: undefined,
      };

      const hass = {} as HomeAssistant;

      expect(checkConditionsMet([condition], hass)).toBe(false);
    });

    it("should handle empty hash correctly", () => {
      window.location.hash = "";

      const condition = {
        condition: "url_hash" as const,
        hash: "",
      };

      const hass = {} as HomeAssistant;

      expect(checkConditionsMet([condition], hass)).toBe(false);
    });

    it("should validate url_hash condition correctly", () => {
      const validCondition = {
        condition: "url_hash" as const,
        hash: "dashboard",
      };

      expect(validateConditionalConfig([validCondition])).toBe(true);
    });

    it("should reject url_hash condition with empty hash", () => {
      const invalidCondition = {
        condition: "url_hash" as const,
        hash: "",
      };

      expect(validateConditionalConfig([invalidCondition])).toBe(false);
    });

    it("should reject url_hash condition with undefined hash", () => {
      const invalidCondition = {
        condition: "url_hash" as const,
        hash: undefined,
      };

      expect(validateConditionalConfig([invalidCondition])).toBe(false);
    });
  });
});
