import { describe, expect, it } from "vitest";
import { getEntityContext } from "../../../../src/common/entity/context/get_entity_context";
import type { HomeAssistant } from "../../../../src/types";
import {
  mockArea,
  mockDevice,
  mockEntity,
  mockFloor,
  mockStateObj,
} from "./context-mock";

describe("getEntityContext", () => {
  it("should return the correct context when the entity exists without device or area", () => {
    const entity = mockEntity({
      entity_id: "light.living_room",
    });
    const stateObj = mockStateObj({
      entity_id: "light.living_room",
    });
    const hass = {
      entities: {
        "light.living_room": entity,
      },
      devices: {},
      areas: {},
      floors: {},
    } as unknown as HomeAssistant;

    const result = getEntityContext(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

    expect(result).toEqual({
      entity,
      device: null,
      area: null,
      floor: null,
    });
  });

  it("should return the correct context when the entity has a device and area", () => {
    const entity = mockEntity({
      entity_id: "light.living_room",
      device_id: "device_1",
    });
    const device = mockDevice({
      id: "device_1",
      area_id: "area_1",
    });
    const area = mockArea({
      area_id: "area_1",
      floor_id: "floor_1",
    });
    const floor = mockFloor({
      floor_id: "floor_1",
    });
    const stateObj = mockStateObj({
      entity_id: "light.living_room",
    });

    const hass = {
      entities: {
        "light.living_room": entity,
      },
      devices: {
        device_1: device,
      },
      areas: {
        area_1: area,
      },
      floors: {
        floor_1: floor,
      },
    } as unknown as HomeAssistant;

    const result = getEntityContext(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

    expect(result).toEqual({
      entity,
      device,
      area,
      floor,
    });
  });

  it("should return the correct context when the entity has an area but no device", () => {
    const entity = mockEntity({
      entity_id: "sensor.kitchen",
      area_id: "area_2",
    });
    const area = mockArea({ area_id: "area_2", floor_id: "floor_2" });
    const floor = mockFloor({ floor_id: "floor_2" });
    const stateObj = mockStateObj({
      entity_id: "sensor.kitchen",
    });

    const hass = {
      entities: {
        "sensor.kitchen": entity,
      },
      devices: {},
      areas: {
        area_2: area,
      },
      floors: {
        floor_2: floor,
      },
    } as unknown as HomeAssistant;

    const result = getEntityContext(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

    expect(result).toEqual({
      entity,
      device: null,
      area,
      floor,
    });
  });

  it("should return null for floor if area does not have a floor_id", () => {
    const entity = mockEntity({
      entity_id: "sensor.bedroom",
      area_id: "area_3",
    });
    const area = mockArea({
      area_id: "area_3",
    });
    const stateObj = mockStateObj({
      entity_id: "sensor.bedroom",
    });

    const hass = {
      entities: {
        "sensor.bedroom": entity,
      },
      devices: {},
      areas: {
        area_3: area,
      },
      floors: {},
    } as unknown as HomeAssistant;

    const result = getEntityContext(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

    expect(result).toEqual({
      entity,
      device: null,
      area,
      floor: null,
    });
  });
});
