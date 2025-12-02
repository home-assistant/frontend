import { describe, expect, it } from "vitest";
import { computeFloorName } from "../../../src/common/entity/compute_floor_name";
import type { FloorRegistryEntry } from "../../../src/data/floor_registry";

describe("computeFloorName", () => {
  it("returns the trimmed name if present", () => {
    const floor: FloorRegistryEntry = { name: "Living Room" } as any;
    expect(computeFloorName(floor)).toBe("Living Room");
  });

  it("trims whitespace from the name", () => {
    const floor: FloorRegistryEntry = { name: "  Upstairs  " } as any;
    expect(computeFloorName(floor)).toBe("Upstairs");
  });

  it("returns empty string if name is empty", () => {
    const floor: FloorRegistryEntry = { name: "" } as any;
    expect(computeFloorName(floor)).toBe("");
  });

  it("returns undefined if name is undefined", () => {
    const floor: FloorRegistryEntry = { name: undefined } as any;
    expect(computeFloorName(floor)).toBeUndefined();
  });
});
