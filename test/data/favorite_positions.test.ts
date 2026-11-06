import { describe, it, expect } from "vitest";
import { normalizeFavoritePositions } from "../../src/data/favorite_positions";

describe("normalizeFavoritePositions", () => {
  it("returns an empty array when positions is undefined", () => {
    expect(normalizeFavoritePositions(undefined)).toEqual([]);
  });

  it("clamps to 0-100 by default", () => {
    expect(normalizeFavoritePositions([-10, 50, 150])).toEqual([0, 50, 100]);
  });

  it("deduplicates values that clamp to the same number", () => {
    expect(normalizeFavoritePositions([50, 150, -10, 50])).toEqual([
      50, 100, 0,
    ]);
  });

  it("skips values that are not numbers", () => {
    expect(normalizeFavoritePositions([10, NaN, 20])).toEqual([10, 20]);
  });

  it("clamps to a custom minimum when provided", () => {
    expect(normalizeFavoritePositions([0, 50, 100], { min: 1 })).toEqual([
      1, 50, 100,
    ]);
  });

  it("still clamps the upper bound to 100 with a custom minimum", () => {
    expect(normalizeFavoritePositions([-5, 150], { min: 1 })).toEqual([1, 100]);
  });
});
