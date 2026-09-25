import { describe, expect, it } from "vitest";
import {
  computeAllowedUnits,
  computeSelectorUnits,
} from "../../src/data/sensor/unit_of_measurement";

const sorted = (units?: (string | null)[]) =>
  units === undefined ? undefined : [...units].sort();

describe("computeAllowedUnits", () => {
  it("is unrestricted without device or state classes", () => {
    expect(computeAllowedUnits()).toBeUndefined();
    expect(computeAllowedUnits([], [])).toBeUndefined();
  });

  it("allows the units of a single device class", () => {
    expect(sorted(computeAllowedUnits(["temperature"]))).toEqual([
      "K",
      "°C",
      "°F",
    ]);
  });

  it("allows the union of the units of several device classes", () => {
    expect(sorted(computeAllowedUnits(["temperature", "humidity"]))).toEqual([
      "%",
      "K",
      "°C",
      "°F",
    ]);
  });

  it("only allows no unit for unitless device classes", () => {
    expect(computeAllowedUnits(["aqi"])).toEqual([null]);
  });

  it("allows nothing for device classes without units", () => {
    expect(computeAllowedUnits(["enum"])).toEqual([]);
  });

  it("is unrestricted for state classes without units", () => {
    expect(computeAllowedUnits(undefined, ["measurement"])).toBeUndefined();
  });

  it("allows the units of a state class", () => {
    expect(computeAllowedUnits(undefined, ["measurement_angle"])).toEqual([
      "°",
    ]);
  });

  it("ignores state classes without units when combined with others", () => {
    expect(
      computeAllowedUnits(undefined, ["measurement_angle", "measurement"])
    ).toEqual(["°"]);
  });

  it("intersects device class and state class units", () => {
    expect(computeAllowedUnits(["temperature"], ["measurement_angle"])).toEqual(
      []
    );
  });

  it("keeps device class units for state classes without units", () => {
    expect(
      computeAllowedUnits(["battery", "humidity"], ["measurement"])
    ).toEqual(["%"]);
  });
});

describe("computeSelectorUnits", () => {
  it("is unrestricted without config and context", () => {
    expect(computeSelectorUnits()).toBeUndefined();
    expect(computeSelectorUnits({}, {})).toBeUndefined();
  });

  it("accepts single values", () => {
    expect(computeSelectorUnits({ device_classes: "aqi" }, undefined)).toEqual([
      null,
    ]);
  });

  it("uses the config only", () => {
    expect(
      sorted(computeSelectorUnits({ device_classes: ["temperature"] }, {}))
    ).toEqual(["K", "°C", "°F"]);
  });

  it("uses the context only", () => {
    expect(
      sorted(
        computeSelectorUnits(undefined, { filter_device_class: "temperature" })
      )
    ).toEqual(["K", "°C", "°F"]);
  });

  it("treats empty context values as not set", () => {
    expect(
      computeSelectorUnits(
        { device_classes: ["aqi"] },
        { filter_device_class: "", filter_state_class: [] }
      )
    ).toEqual([null]);
  });

  it("narrows the config with an overlapping context", () => {
    expect(
      computeSelectorUnits(
        { device_classes: ["temperature", "humidity"] },
        { filter_device_class: "humidity" }
      )
    ).toEqual(["%"]);
  });

  it("allows nothing when config and context don't overlap", () => {
    expect(
      computeSelectorUnits(
        { device_classes: ["temperature"] },
        { filter_state_class: "measurement_angle" }
      )
    ).toEqual([]);
  });
});
