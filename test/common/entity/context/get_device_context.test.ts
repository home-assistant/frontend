import { describe, expect, it } from "vitest";
import { getDeviceArea } from "../../../../src/common/entity/context/get_device_context";
import { mockArea, mockDevice } from "./context-mock";

describe("getDeviceArea", () => {
  it("returns undefined when the device has no area", () => {
    const device = mockDevice({
      id: "device_1",
    });

    const result = getDeviceArea(device, {});

    expect(result).toBeUndefined();
  });

  it("returns the area when the device area exists", () => {
    const device = mockDevice({
      id: "device_2",
      area_id: "area_1",
    });

    const area = mockArea({
      area_id: "area_1",
    });

    const result = getDeviceArea(device, {
      area_1: area,
    });

    expect(result).toEqual(area);
  });

  it("returns undefined when the device area is missing", () => {
    const device = mockDevice({
      id: "device_3",
      area_id: "area_2",
    });

    const result = getDeviceArea(device, {});

    expect(result).toBeUndefined();
  });
});
