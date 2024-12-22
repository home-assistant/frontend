import { describe, expect, it } from "vitest";
import { getAllCombinations } from "../../../src/common/array/combinations";

describe("getAllCombinations", () => {
  it("should return all combinations of an array", () => {
    const result = getAllCombinations([1, 2, 3]);
    expect(result).toEqual([
      [],
      [1],
      [2],
      [1, 2],
      [3],
      [1, 3],
      [2, 3],
      [1, 2, 3],
    ]);
  });

  it("should return an empty array for an empty input", () => {
    const result = getAllCombinations([]);
    expect(result).toEqual([[]]);
  });

  it("should handle an array with one element", () => {
    const result = getAllCombinations([1]);
    expect(result).toEqual([[], [1]]);
  });

  it("should handle an array with duplicate elements", () => {
    const result = getAllCombinations([1, 1]);
    expect(result).toEqual([[], [1], [1], [1, 1]]);
  });
});
