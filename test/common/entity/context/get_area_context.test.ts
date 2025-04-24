import { describe, it, expect } from "vitest";
import { getAreaContext } from "../../../../src/common/entity/context/get_area_context";
import type { HomeAssistant } from "../../../../src/types";

describe("getAreaContext", () => {
  it("should return null values when the area does not exist", () => {
    const hass = {
      areas: {},
      floors: {},
    } as unknown as HomeAssistant;

    const result = getAreaContext("nonexistent.area", hass);

    expect(result).toEqual({
      area: null,
      floor: null,
    });
  });

  it("should return the correct context when the area exists without a floor", () => {
    const hass = {
      areas: {
        area_1: { id: "area_1" },
      },
      floors: {},
    } as unknown as HomeAssistant;

    const result = getAreaContext("area_1", hass);

    expect(result).toEqual({
      area: { id: "area_1" },
      floor: null,
    });
  });

  it("should return the correct context when the area exists with a floor", () => {
    const hass = {
      areas: {
        area_2: { id: "area_2", floor_id: "floor_1" },
      },
      floors: {
        floor_1: { id: "floor_1" },
      },
    } as unknown as HomeAssistant;

    const result = getAreaContext("area_2", hass);

    expect(result).toEqual({
      area: { id: "area_2", floor_id: "floor_1" },
      floor: { id: "floor_1" },
    });
  });
});
