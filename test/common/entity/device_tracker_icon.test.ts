import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import { deviceTrackerIcon } from "../../../src/common/entity/device_tracker_icon";

describe("deviceTrackerIcon", () => {
  const createMockStateObj = (
    source_type: string,
    state = "home"
  ): HassEntity => ({
    entity_id: "device_tracker.test",
    state,
    attributes: { source_type },
    context: { id: "test", parent_id: null, user_id: null },
    last_changed: "2023-01-01T00:00:00Z",
    last_updated: "2023-01-01T00:00:00Z",
  });

  describe("router source type", () => {
    it("should return lan-connect icon when home", () => {
      const stateObj = createMockStateObj("router", "home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:lan-connect");
    });

    it("should return lan-disconnect icon when not home", () => {
      const stateObj = createMockStateObj("router", "not_home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:lan-disconnect");
    });

    it("should return lan-disconnect icon for any other state", () => {
      const stateObj = createMockStateObj("router", "office");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:lan-disconnect");
    });

    it("should use explicit state parameter over state object state", () => {
      const stateObj = createMockStateObj("router", "not_home");
      expect(deviceTrackerIcon(stateObj, "home")).toBe("mdi:lan-connect");
    });
  });

  describe("bluetooth source type", () => {
    it("should return bluetooth-connect icon when home for bluetooth", () => {
      const stateObj = createMockStateObj("bluetooth", "home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:bluetooth-connect");
    });

    it("should return bluetooth icon when not home for bluetooth", () => {
      const stateObj = createMockStateObj("bluetooth", "not_home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:bluetooth");
    });

    it("should return bluetooth-connect icon when home for bluetooth_le", () => {
      const stateObj = createMockStateObj("bluetooth_le", "home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:bluetooth-connect");
    });

    it("should return bluetooth icon when not home for bluetooth_le", () => {
      const stateObj = createMockStateObj("bluetooth_le", "not_home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:bluetooth");
    });

    it("should use explicit state parameter for bluetooth", () => {
      const stateObj = createMockStateObj("bluetooth", "not_home");
      expect(deviceTrackerIcon(stateObj, "home")).toBe("mdi:bluetooth-connect");
    });
  });

  describe("other source types", () => {
    it("should return account icon when home for gps", () => {
      const stateObj = createMockStateObj("gps", "home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:account");
    });

    it("should return account-arrow-right icon when not home for gps", () => {
      const stateObj = createMockStateObj("gps", "not_home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:account-arrow-right");
    });

    it("should return account icon for unknown location with gps", () => {
      const stateObj = createMockStateObj("gps", "office");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:account");
    });

    it("should handle unknown source type", () => {
      const stateObj = createMockStateObj("unknown", "home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:account");
    });

    it("should handle unknown source type when not home", () => {
      const stateObj = createMockStateObj("unknown", "not_home");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:account-arrow-right");
    });
  });

  describe("edge cases", () => {
    it("should handle missing source_type attribute", () => {
      const stateObj: HassEntity = {
        entity_id: "device_tracker.test",
        state: "home",
        attributes: {},
        context: { id: "test", parent_id: null, user_id: null },
        last_changed: "2023-01-01T00:00:00Z",
        last_updated: "2023-01-01T00:00:00Z",
      };
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:account");
    });

    it("should handle undefined state object attributes", () => {
      const stateObj: HassEntity = {
        entity_id: "device_tracker.test",
        state: "not_home",
        attributes: {},
        context: { id: "test", parent_id: null, user_id: null },
        last_changed: "2023-01-01T00:00:00Z",
        last_updated: "2023-01-01T00:00:00Z",
      };
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:account-arrow-right");
    });

    it("should handle empty string state", () => {
      const stateObj = createMockStateObj("router", "");
      expect(deviceTrackerIcon(stateObj)).toBe("mdi:lan-disconnect");
    });
  });
});
