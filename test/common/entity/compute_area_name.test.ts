import { describe, expect, it } from "vitest";
import { computeAreaName } from "../../../src/common/entity/compute_area_name";
import type { AreaRegistryEntry } from "../../../src/data/area_registry";

describe("computeAreaName", () => {
  it("returns the trimmed name if present", () => {
    const area: AreaRegistryEntry = {
      name: "Living Room",
    } as AreaRegistryEntry;
    expect(computeAreaName(area)).toBe("Living Room");
  });

  it("trims whitespace from the name", () => {
    const area: AreaRegistryEntry = {
      name: "  Kitchen  ",
    } as AreaRegistryEntry;
    expect(computeAreaName(area)).toBe("Kitchen");
  });

  it("returns undefined if name is missing", () => {
    const area: AreaRegistryEntry = {} as AreaRegistryEntry;
    expect(computeAreaName(area)).toBeUndefined();
  });

  it("returns empty string if name is only whitespace", () => {
    const area: AreaRegistryEntry = { name: "   " } as AreaRegistryEntry;
    expect(computeAreaName(area)).toBe("");
  });
});
