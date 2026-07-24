import { describe, it, expect } from "vitest";

import { stripBoundaryLabel } from "../../../src/common/string/strip_boundary_label";

describe("stripBoundaryLabel", () => {
  it("returns an empty string when the text equals the label", () => {
    expect(stripBoundaryLabel("Kitchen", "Kitchen")).toBe("");
  });

  it("strips a prefix on a word boundary", () => {
    expect(stripBoundaryLabel("Living Room Thermostat", "Living Room")).toBe(
      "Thermostat"
    );
  });

  it("strips a suffix on a word boundary", () => {
    expect(stripBoundaryLabel("Thermostat Living Room", "Living Room")).toBe(
      "Thermostat"
    );
  });

  it("is case-insensitive and keeps the remainder's casing", () => {
    expect(stripBoundaryLabel("living room Thermostat", "Living Room")).toBe(
      "Thermostat"
    );
  });

  it("trims different separators", () => {
    expect(stripBoundaryLabel("Kitchen - Sensor", "Kitchen")).toBe("Sensor");
    expect(stripBoundaryLabel("Kitchen_Sensor", "Kitchen")).toBe("Sensor");
    expect(stripBoundaryLabel("Kitchen.Sensor", "Kitchen")).toBe("Sensor");
  });

  it("does not match in the middle of a word", () => {
    expect(stripBoundaryLabel("Kitchenette Sensor", "Kitchen")).toBeNull();
    expect(stripBoundaryLabel("Sub Kitchenette", "Kitchen")).toBeNull();
  });

  it("returns null when the label is absent", () => {
    expect(stripBoundaryLabel("Living Room Sensor", "Kitchen")).toBeNull();
  });

  it("returns an empty string when only separators are left", () => {
    expect(stripBoundaryLabel("Kitchen -", "Kitchen")).toBe("");
  });
});
