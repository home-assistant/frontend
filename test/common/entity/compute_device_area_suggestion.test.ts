import { describe, it, expect } from "vitest";

import {
  computeDeviceAreaSuggestion,
  type AreaForNameMatch,
} from "../../../src/common/entity/compute_device_area_suggestion";

const AREAS: AreaForNameMatch[] = [
  { area_id: "living_room", name: "Living Room", aliases: ["Lounge"] },
  { area_id: "kitchen", name: "Kitchen" },
  { area_id: "master", name: "Master" },
  { area_id: "master_bedroom", name: "Master Bedroom" },
];

describe("computeDeviceAreaSuggestion", () => {
  describe("device without an area", () => {
    it("strips a prefix area and suggests it", () => {
      expect(
        computeDeviceAreaSuggestion("Living Room Thermostat", null, AREAS)
      ).toEqual({ name: "Thermostat", area: "living_room" });
    });

    it("strips a suffix area and suggests it", () => {
      expect(
        computeDeviceAreaSuggestion("Thermostat Living Room", null, AREAS)
      ).toEqual({ name: "Thermostat", area: "living_room" });
    });

    it("matches an area alias", () => {
      expect(computeDeviceAreaSuggestion("Lounge Lamp", null, AREAS)).toEqual({
        name: "Lamp",
        area: "living_room",
      });
    });

    it("prefers the longest matching area name", () => {
      expect(
        computeDeviceAreaSuggestion("Master Bedroom Lamp", null, AREAS)
      ).toEqual({ name: "Lamp", area: "master_bedroom" });
    });

    it("is a no-op when the name equals an area and does not fall back to a shorter one", () => {
      expect(
        computeDeviceAreaSuggestion("Master Bedroom", null, AREAS)
      ).toBeNull();
    });

    it("does not match in the middle of a word", () => {
      expect(
        computeDeviceAreaSuggestion("Kitchenette Sensor", null, AREAS)
      ).toBeNull();
    });

    it("matches case-insensitively and keeps the remainder's casing", () => {
      expect(
        computeDeviceAreaSuggestion("living room thermostat", null, AREAS)
      ).toEqual({ name: "thermostat", area: "living_room" });
    });

    it("trims residual separators after stripping", () => {
      expect(
        computeDeviceAreaSuggestion("Living Room - Thermostat", null, AREAS)
      ).toEqual({ name: "Thermostat", area: "living_room" });
    });

    it("does nothing when no area matches", () => {
      expect(
        computeDeviceAreaSuggestion("Random Device", null, AREAS)
      ).toBeNull();
    });
  });

  describe("device with an area already set", () => {
    it("strips the name but keeps the area when it matches", () => {
      expect(
        computeDeviceAreaSuggestion("Kitchen Sensor", "kitchen", AREAS)
      ).toEqual({ name: "Sensor" });
    });

    it("never overrides the area when the name does not match it", () => {
      expect(
        computeDeviceAreaSuggestion("Living Room Sensor", "kitchen", AREAS)
      ).toBeNull();
    });

    it("is a no-op when the name equals its own area", () => {
      expect(
        computeDeviceAreaSuggestion("Kitchen", "kitchen", AREAS)
      ).toBeNull();
    });
  });

  it("does nothing for an empty name", () => {
    expect(computeDeviceAreaSuggestion("  ", null, AREAS)).toBeNull();
    expect(computeDeviceAreaSuggestion(undefined, null, AREAS)).toBeNull();
  });
});
