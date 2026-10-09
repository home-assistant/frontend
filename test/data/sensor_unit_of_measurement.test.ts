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

  it("only allows no unit for non-numeric device classes", () => {
    expect(computeAllowedUnits(["enum"])).toEqual([null]);
    expect(computeAllowedUnits(["date"])).toEqual([null]);
    expect(computeAllowedUnits(["timestamp"])).toEqual([null]);
    expect(computeAllowedUnits(["uptime"])).toEqual([null]);
    expect(computeAllowedUnits(["date", "timestamp", "uptime"])).toEqual([
      null,
    ]);
  });

  it("is unrestricted for numeric device classes without a unit table", () => {
    expect(computeAllowedUnits(["monetary"])).toBeUndefined();
  });

  it("is unrestricted when one of the device classes does not restrict", () => {
    expect(computeAllowedUnits(["temperature", "monetary"])).toBeUndefined();
  });

  it("adds no unit for a non-numeric device class in a list", () => {
    const units = computeAllowedUnits(["temperature", "enum"]);
    expect(units).toHaveLength(4);
    expect(units).toEqual(expect.arrayContaining(["K", "°C", "°F", null]));
  });

  it("is unrestricted for state classes without units", () => {
    expect(computeAllowedUnits(undefined, ["measurement"])).toBeUndefined();
  });

  it("allows the units of a state class", () => {
    expect(computeAllowedUnits(undefined, ["measurement_angle"])).toEqual([
      "°",
    ]);
  });

  it("is unrestricted when one of the state classes does not restrict", () => {
    expect(
      computeAllowedUnits(undefined, ["measurement_angle", "measurement"])
    ).toBeUndefined();
  });

  it("keeps device class units for mixed state classes", () => {
    expect(
      computeAllowedUnits(
        ["battery", "humidity"],
        ["measurement_angle", "measurement"]
      )
    ).toEqual(["%"]);
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

  it("only allows no unit for a non-numeric device class in the context", () => {
    expect(
      computeSelectorUnits(undefined, { filter_device_class: "timestamp" })
    ).toEqual([null]);
    expect(
      computeSelectorUnits(undefined, { filter_device_class: "uptime" })
    ).toEqual([null]);
  });

  it("is unrestricted for a monetary device class in the context", () => {
    expect(
      computeSelectorUnits(undefined, { filter_device_class: "monetary" })
    ).toBeUndefined();
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
