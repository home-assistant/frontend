import { describe, expect, it } from "vitest";
import { getDeviceClassOptions } from "../../src/components/ha-device-class-picker";
import type { LocalizeFunc } from "../../src/common/translations/localize";

const localize = ((key: string) =>
  key === "component.sensor.entity_component.temperature.name"
    ? "Temperature"
    : "") as LocalizeFunc;

describe("getDeviceClassOptions", () => {
  it("labels a device class with its translated name", () => {
    const options = getDeviceClassOptions("sensor", localize);

    expect(options).toContainEqual({
      id: "temperature",
      primary: "Temperature",
      sorting_label: "Temperature",
    });
  });

  it("falls back to the device class itself when it has no translated name", () => {
    const options = getDeviceClassOptions("sensor", localize);

    expect(options.every((option) => option.primary)).toBe(true);
    expect(options).toContainEqual({
      id: "humidity",
      primary: "humidity",
      sorting_label: "humidity",
    });
  });

  it("returns no option for a domain without device classes", () => {
    expect(getDeviceClassOptions("light", localize)).toEqual([]);
  });
});
