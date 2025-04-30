import { describe, expect, it } from "vitest";
import { getDeviceContext } from "../../../../src/common/entity/context/get_device_context";
import type { HomeAssistant } from "../../../../src/types";
import { mockArea, mockDevice, mockFloor } from "./context-mock";

describe("getDeviceContext", () => {
  it("should return the correct context when the device exists without area", () => {
    const device = mockDevice({
      id: "device_1",
    });

    const hass = {
      devices: {
        device_1: device,
      },
      areas: {},
      floors: {},
    } as unknown as HomeAssistant;

    const result = getDeviceContext(device, hass);

    expect(result).toEqual({
      device,
      area: null,
      floor: null,
    });
  });

  it("should return the correct context when the device exists with area but no floor", () => {
    const device = mockDevice({
      id: "device_2",
      area_id: "area_1",
    });

    const area = mockArea({
      area_id: "area_1",
    });

    const hass = {
      devices: {
        device_2: device,
      },
      areas: {
        area_1: area,
      },
      floors: {},
    } as unknown as HomeAssistant;

    const result = getDeviceContext(device, hass);

    expect(result).toEqual({
      device,
      area,
      floor: null,
    });
  });

  it("should return the correct context when the device exists with area and floor", () => {
    const device = mockDevice({
      id: "device_3",
      area_id: "area_2",
    });

    const area = mockArea({
      area_id: "area_2",
      floor_id: "floor_1",
    });

    const floor = mockFloor({
      floor_id: "floor_1",
    });

    const hass = {
      devices: {
        device_3: device,
      },
      areas: {
        area_2: area,
      },
      floors: {
        floor_1: floor,
      },
    } as unknown as HomeAssistant;

    const result = getDeviceContext(device, hass);

    expect(result).toEqual({
      device,
      area,
      floor,
    });
  });
});
