import { describe, expect, it } from "vitest";
import { getAreaContext } from "../../../../src/common/entity/context/get_area_context";
import { mockArea, mockFloor } from "./context-mock";

describe("getAreaContext", () => {
  it("should return the correct context when the area exists without a floor", () => {
    const area = mockArea({
      area_id: "area_1",
    });

    const result = getAreaContext(area, {});

    expect(result).toEqual({
      area,
      floor: null,
    });
  });

  it("should return the correct context when the area exists with a floor", () => {
    const area = mockArea({
      area_id: "area_2",
      floor_id: "floor_1",
    });

    const floor = mockFloor({
      floor_id: "floor_1",
    });

    const result = getAreaContext(area, {
      floor_1: floor,
    });

    expect(result).toEqual({
      area,
      floor,
    });
  });
});
