import { describe, it, expect } from "vitest";
import { thresholdStateColorProperty } from "../../../../src/common/entity/color/threshold_color";

describe("threshold_color", () => {
  it("should return success color for green state", () => {
    const color = thresholdStateColorProperty("green");
    expect(color).toBe("--state-sensor-threshold-green-color");
  });

  it("should return warning color for yellow state", () => {
    const color = thresholdStateColorProperty("yellow");
    expect(color).toBe("--state-sensor-threshold-yellow-color");
  });

  it("should return error color for red state", () => {
    const color = thresholdStateColorProperty("red");
    expect(color).toBe("--state-sensor-threshold-red-color");
  });

  it("should return undefined for unknown state", () => {
    expect(thresholdStateColorProperty("blue")).toBe(undefined);
    expect(thresholdStateColorProperty("")).toBe(undefined);
    expect(thresholdStateColorProperty("unknown")).toBe(undefined);
  });
});
