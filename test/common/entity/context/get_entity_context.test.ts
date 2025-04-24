import { describe, it, expect } from "vitest";
import type { HomeAssistant } from "../../../../src/types";
import { getEntityContext } from "../../../../src/common/entity/context/get_entity_context";

describe("getEntityContext", () => {
  it("should return null values when the entity does not exist", () => {
    const hass = {
      entities: {},
      devices: {},
      areas: {},
      floors: {},
    } as unknown as HomeAssistant;

    const result = getEntityContext("nonexistent.entity", hass);

    expect(result).toEqual({
      entity: null,
      device: null,
      area: null,
      floor: null,
    });
  });

  it("should return the correct context when the entity exists without device or area", () => {
    const hass = {
      entities: {
        "light.living_room": { entity_id: "light.living_room" },
      },
      devices: {},
      areas: {},
      floors: {},
    } as unknown as HomeAssistant;

    const result = getEntityContext("light.living_room", hass);

    expect(result).toEqual({
      entity: { entity_id: "light.living_room" },
      device: null,
      area: null,
      floor: null,
    });
  });

  it("should return the correct context when the entity has a device and area", () => {
    const hass = {
      entities: {
        "light.living_room": {
          entity_id: "light.living_room",
          device_id: "device_1",
        },
      },
      devices: {
        device_1: { id: "device_1", area_id: "area_1" },
      },
      areas: {
        area_1: { id: "area_1", floor_id: "floor_1" },
      },
      floors: {
        floor_1: { id: "floor_1" },
      },
    } as unknown as HomeAssistant;

    const result = getEntityContext("light.living_room", hass);

    expect(result).toEqual({
      entity: { entity_id: "light.living_room", device_id: "device_1" },
      device: { id: "device_1", area_id: "area_1" },
      area: { id: "area_1", floor_id: "floor_1" },
      floor: { id: "floor_1" },
    });
  });

  it("should return the correct context when the entity has an area but no device", () => {
    const hass = {
      entities: {
        "sensor.kitchen": { entity_id: "sensor.kitchen", area_id: "area_2" },
      },
      devices: {},
      areas: {
        area_2: { id: "area_2", floor_id: "floor_2" },
      },
      floors: {
        floor_2: { id: "floor_2" },
      },
    } as unknown as HomeAssistant;

    const result = getEntityContext("sensor.kitchen", hass);

    expect(result).toEqual({
      entity: { entity_id: "sensor.kitchen", area_id: "area_2" },
      device: null,
      area: { id: "area_2", floor_id: "floor_2" },
      floor: { id: "floor_2" },
    });
  });

  it("should return null for floor if area does not have a floor_id", () => {
    const hass = {
      entities: {
        "sensor.bedroom": { entity_id: "sensor.bedroom", area_id: "area_3" },
      },
      devices: {},
      areas: {
        area_3: { id: "area_3" },
      },
      floors: {},
    } as unknown as HomeAssistant;

    const result = getEntityContext("sensor.bedroom", hass);

    expect(result).toEqual({
      entity: { entity_id: "sensor.bedroom", area_id: "area_3" },
      device: null,
      area: { id: "area_3" },
      floor: null,
    });
  });
});
