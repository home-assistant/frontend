import { describe, it, expect } from "vitest";
import { batteryStateColor } from "../../../../src/common/entity/color/battery_color";

describe("battery_color", () => {
  it("should return green for high battery level", () => {
    let color = batteryStateColor("70");
    expect(color).toBe("--state-sensor-battery-high-color");
    color = batteryStateColor("200");
    expect(color).toBe("--state-sensor-battery-high-color");
  });

  it("should return yellow for medium battery level", () => {
    let color = batteryStateColor("69.99");
    expect(color).toBe("--state-sensor-battery-medium-color");
    color = batteryStateColor("30");
    expect(color).toBe("--state-sensor-battery-medium-color");
  });

  it("should return red for low battery level", () => {
    let color = batteryStateColor("29.999");
    expect(color).toBe("--state-sensor-battery-low-color");
    color = batteryStateColor("-20");
    expect(color).toBe("--state-sensor-battery-low-color");
  });

  // add nan test
  it("should return undefined for non-numeric state", () => {
    const color = batteryStateColor("not a number");
    expect(color).toBe(undefined);
  });
});
