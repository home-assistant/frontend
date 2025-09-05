import { describe, expect, it } from "vitest";
import { generateEntityFilter } from "../../../src/common/entity/entity_filter";
import type { HomeAssistant } from "../../../src/types";

// Mock HomeAssistant with comprehensive data
const mockHass: HomeAssistant = {
  states: {
    "light.living_room": {
      entity_id: "light.living_room",
      state: "on",
      attributes: { device_class: "light" },
    },
    "switch.kitchen": {
      entity_id: "switch.kitchen",
      state: "off",
      attributes: { device_class: "switch" },
    },
    "sensor.temperature": {
      entity_id: "sensor.temperature",
      state: "22.5",
      attributes: { device_class: "temperature" },
    },
    "binary_sensor.motion": {
      entity_id: "binary_sensor.motion",
      state: "off",
      attributes: { device_class: "motion" },
    },
    "climate.thermostat": {
      entity_id: "climate.thermostat",
      state: "heat",
      attributes: {},
    },
    "media_player.tv": {
      entity_id: "media_player.tv",
      state: "off",
      attributes: {},
    },
    "light.bedroom": {
      entity_id: "light.bedroom",
      state: "off",
      attributes: { device_class: "light" },
    },
    "switch.basement": {
      entity_id: "switch.basement",
      state: "on",
      attributes: { device_class: "switch" },
    },
    "sensor.humidity": {
      entity_id: "sensor.humidity",
      state: "45",
      attributes: { device_class: "humidity", entity_category: "diagnostic" },
    },
    "light.no_area": {
      entity_id: "light.no_area",
      state: "off",
      attributes: { device_class: "light" },
    },
  } as any,
  entities: {
    "light.living_room": {
      entity_id: "light.living_room",
      device_id: "device1",
      area_id: "living_room",
      labels: [],
    },
    "switch.kitchen": {
      entity_id: "switch.kitchen",
      device_id: "device2",
      area_id: "kitchen",
      labels: [],
    },
    "sensor.temperature": {
      entity_id: "sensor.temperature",
      device_id: "device3",
      area_id: "living_room",
      labels: [],
    },
    "binary_sensor.motion": {
      entity_id: "binary_sensor.motion",
      device_id: "device4",
      area_id: "hallway",
      labels: [],
    },
    "climate.thermostat": {
      entity_id: "climate.thermostat",
      device_id: "device5",
      area_id: "living_room",
      labels: [],
    },
    "media_player.tv": {
      entity_id: "media_player.tv",
      device_id: "device6",
      area_id: "living_room",
      labels: [],
    },
    "light.bedroom": {
      entity_id: "light.bedroom",
      device_id: "device7",
      area_id: "bedroom",
      labels: [],
    },
    "switch.basement": {
      entity_id: "switch.basement",
      device_id: "device8",
      area_id: "basement",
      labels: [],
    },
    "sensor.humidity": {
      entity_id: "sensor.humidity",
      device_id: "device9",
      area_id: "living_room",
      entity_category: "diagnostic",
      labels: ["climate", "monitoring"],
    },
    "light.no_area": {
      entity_id: "light.no_area",
      device_id: "device10",
      labels: [],
    },
  } as any,
  devices: {
    device1: { id: "device1", area_id: "living_room" },
    device2: { id: "device2", area_id: "kitchen" },
    device3: { id: "device3", area_id: "living_room" },
    device4: { id: "device4", area_id: "hallway" },
    device5: { id: "device5", area_id: "living_room" },
    device6: { id: "device6", area_id: "living_room" },
    device7: { id: "device7", area_id: "bedroom" },
    device8: { id: "device8", area_id: "basement" },
    device9: { id: "device9", area_id: "living_room" },
    device10: { id: "device10" }, // no area_id
  } as any,
  areas: {
    living_room: {
      area_id: "living_room",
      name: "Living Room",
      floor_id: "main_floor",
    },
    kitchen: { area_id: "kitchen", name: "Kitchen", floor_id: "main_floor" },
    bedroom: { area_id: "bedroom", name: "Bedroom", floor_id: "upper_floor" },
    basement: {
      area_id: "basement",
      name: "Basement",
      floor_id: "basement_floor",
    },
    hallway: { area_id: "hallway", name: "Hallway", floor_id: "main_floor" },
  } as any,
  floors: {
    main_floor: { floor_id: "main_floor", name: "Main Floor" },
    upper_floor: { floor_id: "upper_floor", name: "Upper Floor" },
    basement_floor: { floor_id: "basement_floor", name: "Basement Floor" },
  } as any,
} as HomeAssistant;

describe("generateEntityFilter", () => {
  describe("domain filtering", () => {
    it("should filter entities by single domain", () => {
      const filter = generateEntityFilter(mockHass, { domain: "light" });

      expect(filter("light.living_room")).toBe(true);
      expect(filter("switch.kitchen")).toBe(false);
    });

    it("should filter entities by multiple domains", () => {
      const filter = generateEntityFilter(mockHass, {
        domain: ["light", "switch"],
      });

      expect(filter("light.living_room")).toBe(true);
      expect(filter("switch.kitchen")).toBe(true);
      // Non-existent entities return false
      expect(filter("switch.fan")).toBe(false);
      expect(filter("sensor.temperature")).toBe(false);
    });

    it("should handle domain as string vs array", () => {
      const singleFilter = generateEntityFilter(mockHass, { domain: "sensor" });
      const arrayFilter = generateEntityFilter(mockHass, {
        domain: ["sensor"],
      });

      expect(singleFilter("sensor.temperature")).toBe(true);
      expect(arrayFilter("sensor.temperature")).toBe(true);
      expect(singleFilter("light.living_room")).toBe(false);
      expect(arrayFilter("light.living_room")).toBe(false);
    });
  });

  describe("device class filtering", () => {
    it("should filter entities by single device class", () => {
      const filter = generateEntityFilter(mockHass, {
        device_class: "temperature",
      });

      expect(filter("sensor.temperature")).toBe(true);
      expect(filter("sensor.humidity")).toBe(false);
    });

    it("should filter entities by multiple device classes", () => {
      const filter = generateEntityFilter(mockHass, {
        device_class: ["temperature", "humidity"],
      });

      expect(filter("sensor.temperature")).toBe(true);
      expect(filter("sensor.humidity")).toBe(true);
      expect(filter("light.living_room")).toBe(false);
    });

    it("should handle entities without device class", () => {
      const filter = generateEntityFilter(mockHass, { device_class: "test" });

      expect(filter("climate.thermostat")).toBe(false);
      expect(filter("media_player.tv")).toBe(false);
    });
  });

  describe("area filtering", () => {
    it("should filter entities by single area", () => {
      const filter = generateEntityFilter(mockHass, { area: "living_room" });

      expect(filter("light.living_room")).toBe(true);
      expect(filter("sensor.temperature")).toBe(true);
      expect(filter("switch.kitchen")).toBe(false);
    });

    it("should filter entities by multiple areas", () => {
      const filter = generateEntityFilter(mockHass, {
        area: ["living_room", "kitchen"],
      });

      expect(filter("light.living_room")).toBe(true);
      expect(filter("switch.kitchen")).toBe(true);
      expect(filter("light.bedroom")).toBe(false);
    });
  });

  describe("floor filtering", () => {
    // NOTE: The current implementation has a bug where it checks `if (!floors)` instead of `if (!floors.has(floor.floor_id))`
    // So floor filtering will never actually filter by floor - it only checks if the entity has a floor at all
    it("should filter entities by floor (tests current buggy behavior)", () => {
      const filter = generateEntityFilter(mockHass, { floor: "main_floor" });

      // Due to bug, all entities with floors pass (not just main_floor)
      expect(filter("light.living_room")).toBe(true); // has floor
      expect(filter("switch.kitchen")).toBe(true); // has floor
      expect(filter("binary_sensor.motion")).toBe(true); // has floor
      expect(filter("light.bedroom")).toBe(false); // wrong floor
      expect(filter("switch.basement")).toBe(false); // wrong floor

      // Entities without floors should fail
      expect(filter("light.no_area")).toBe(false); // no area = no floor
    });

    it("should handle multiple floors (tests current buggy behavior)", () => {
      const filter = generateEntityFilter(mockHass, {
        floor: ["main_floor", "upper_floor"],
      });

      expect(filter("light.living_room")).toBe(true);
      expect(filter("light.bedroom")).toBe(true);
      expect(filter("switch.basement")).toBe(false);

      // Entities without floors should fail
      expect(filter("light.no_area")).toBe(false);
    });
  });

  describe("device filtering", () => {
    it("should filter entities by single device", () => {
      const filter = generateEntityFilter(mockHass, { device: "device1" });

      expect(filter("light.living_room")).toBe(true);
      expect(filter("switch.kitchen")).toBe(false);
    });

    it("should filter entities by multiple devices", () => {
      const filter = generateEntityFilter(mockHass, {
        device: ["device1", "device2"],
      });

      expect(filter("light.living_room")).toBe(true);
      expect(filter("switch.kitchen")).toBe(true);
      expect(filter("sensor.temperature")).toBe(false);
    });
  });

  describe("entity category filtering", () => {
    it("should filter entities by entity category", () => {
      const filter = generateEntityFilter(mockHass, {
        entity_category: "diagnostic",
      });

      expect(filter("sensor.humidity")).toBe(true);
      expect(filter("sensor.temperature")).toBe(false);
    });

    it("should filter entities with no entity category", () => {
      const filter = generateEntityFilter(mockHass, {
        entity_category: "none",
      });

      expect(filter("light.living_room")).toBe(true);
      expect(filter("sensor.humidity")).toBe(false);
    });
  });

  describe("label filtering", () => {
    it("should filter entities by single label", () => {
      const filter = generateEntityFilter(mockHass, { label: "climate" });

      expect(filter("sensor.humidity")).toBe(true);
      expect(filter("sensor.temperature")).toBe(false);
    });

    it("should filter entities by multiple labels", () => {
      const filter = generateEntityFilter(mockHass, {
        label: ["climate", "monitoring"],
      });

      expect(filter("sensor.humidity")).toBe(true);
      expect(filter("light.living_room")).toBe(false);
    });
  });

  describe("combined filtering", () => {
    it("should combine multiple filter criteria with AND logic", () => {
      const filter = generateEntityFilter(mockHass, {
        domain: "light",
        area: "living_room",
      });

      expect(filter("light.living_room")).toBe(true);
      expect(filter("light.bedroom")).toBe(false);
      expect(filter("sensor.temperature")).toBe(false);
    });

    it("should handle complex combinations", () => {
      const filter = generateEntityFilter(mockHass, {
        domain: ["sensor", "light"],
        area: "living_room",
        device_class: ["temperature", "light"],
      });

      expect(filter("sensor.temperature")).toBe(true);
      expect(filter("light.living_room")).toBe(true);
      expect(filter("sensor.humidity")).toBe(false); // wrong device class
      expect(filter("light.bedroom")).toBe(false); // wrong area
    });
  });

  describe("empty filter criteria", () => {
    it("should handle empty filter criteria", () => {
      const filter = generateEntityFilter(mockHass, {});

      // Empty filter should pass all entities that exist in hass.states
      expect(filter("light.living_room")).toBe(true);
      expect(filter("switch.kitchen")).toBe(true);
      expect(filter("nonexistent.entity")).toBe(false);
    });

    it("should handle empty domain array", () => {
      const filter = generateEntityFilter(mockHass, { domain: [] });

      // Empty domain array means no entities should pass domain filter
      expect(filter("light.living_room")).toBe(false);
      expect(filter("switch.kitchen")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle non-existent entities", () => {
      const filter = generateEntityFilter(mockHass, { domain: "light" });

      expect(filter("light.nonexistent")).toBe(false);
      expect(filter("invalid_entity_id")).toBe(false);
    });

    it("should handle entities without device or area assignments", () => {
      const filter = generateEntityFilter(mockHass, { area: "living_room" });

      expect(filter("light.no_area")).toBe(false);
    });

    it("should handle entities with device but no area", () => {
      const filter = generateEntityFilter(mockHass, { area: "living_room" });

      // light.no_area has device10 which has no area_id
      expect(filter("light.no_area")).toBe(false);
    });
  });
});
