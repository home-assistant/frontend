import { describe, it, expect } from "vitest";
import { pruneOrphanedSegments } from "../../src/data/vacuum";
import type { Segment } from "../../src/data/vacuum";

const segment = (id: string): Segment => ({ id, name: `Segment ${id}` });

describe("pruneOrphanedSegments", () => {
  it("removes segment IDs that are no longer reported", () => {
    const result = pruneOrphanedSegments({ kitchen: ["1", "2"], hall: ["3"] }, [
      segment("1"),
      segment("3"),
    ]);
    // "2" is gone from the kitchen, "3" stays in the hall.
    expect(result).toEqual({ kitchen: ["1"], hall: ["3"] });
  });

  it("drops areas left without any reported segment", () => {
    const result = pruneOrphanedSegments({ kitchen: ["1"], attic: ["99"] }, [
      segment("1"),
    ]);
    expect(result).toEqual({ kitchen: ["1"] });
  });

  it("keeps the mapping unchanged when all segments are still reported", () => {
    const mapping = { kitchen: ["1", "2"], hall: ["3"] };
    const result = pruneOrphanedSegments(mapping, [
      segment("1"),
      segment("2"),
      segment("3"),
    ]);
    expect(result).toEqual(mapping);
  });

  it("returns an empty mapping when no segments are reported", () => {
    const result = pruneOrphanedSegments({ kitchen: ["1"], hall: ["2"] }, []);
    expect(result).toEqual({});
  });
});
