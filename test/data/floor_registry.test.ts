import { describe, expect, it } from "vitest";
import { floorCompare } from "../../src/data/floor_registry";
import type { FloorRegistryEntry } from "../../src/data/floor_registry";

describe("floorCompare", () => {
  describe("floorCompare()", () => {
    it("sorts by floor ID alphabetically", () => {
      const floors = ["basement", "attic", "ground"];

      expect(floors.sort(floorCompare())).toEqual([
        "attic",
        "basement",
        "ground",
      ]);
    });

    it("handles numeric strings in natural order", () => {
      const floors = ["floor10", "floor2", "floor1"];

      expect(floors.sort(floorCompare())).toEqual([
        "floor1",
        "floor2",
        "floor10",
      ]);
    });
  });

  describe("floorCompare(entries)", () => {
    it("sorts by floor name from entries", () => {
      const entries = {
        floor1: { name: "Ground Floor" } as FloorRegistryEntry,
        floor2: { name: "First Floor" } as FloorRegistryEntry,
        floor3: { name: "Basement" } as FloorRegistryEntry,
      };
      const floors = ["floor1", "floor2", "floor3"];

      expect(floors.sort(floorCompare(entries))).toEqual([
        "floor3",
        "floor2",
        "floor1",
      ]);
    });

    it("falls back to floor ID when entry not found", () => {
      const entries = {
        floor1: { name: "Ground Floor" } as FloorRegistryEntry,
      };
      const floors = ["xyz", "floor1", "abc"];

      expect(floors.sort(floorCompare(entries))).toEqual([
        "abc",
        "floor1",
        "xyz",
      ]);
    });
  });

  describe("floorCompare(entries, order)", () => {
    it("follows order array", () => {
      const entries = {
        basement: { name: "Basement" } as FloorRegistryEntry,
        ground: { name: "Ground Floor" } as FloorRegistryEntry,
        first: { name: "First Floor" } as FloorRegistryEntry,
      };
      const order = ["first", "ground", "basement"];
      const floors = ["basement", "first", "ground"];

      expect(floors.sort(floorCompare(entries, order))).toEqual([
        "first",
        "ground",
        "basement",
      ]);
    });

    it("places items not in order array at the end, sorted by name", () => {
      const entries = {
        floor1: { name: "First Floor" } as FloorRegistryEntry,
        floor2: { name: "Ground Floor" } as FloorRegistryEntry,
        floor3: { name: "Basement" } as FloorRegistryEntry,
      };
      const order = ["floor1"];
      const floors = ["floor3", "floor2", "floor1"];

      expect(floors.sort(floorCompare(entries, order))).toEqual([
        "floor1",
        "floor3",
        "floor2",
      ]);
    });
  });
});
