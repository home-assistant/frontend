import { describe, expect, it } from "vitest";
import { ensureArray } from "../../../src/common/array/ensure-array";

describe("ensureArray", () => {
  it("should return undefined when input is undefined", () => {
    expect(ensureArray(undefined)).toBeUndefined();
  });

  it("should return the same array when input is an array", () => {
    const arr = [1, 2, 3];
    expect(ensureArray(arr)).toBe(arr);
  });

  it("should wrap non-array value in an array", () => {
    const value = 5;
    expect(ensureArray(value)).toEqual([value]);
  });

  it("should wrap non-array object in an array", () => {
    const value = { key: "value" };
    expect(ensureArray(value)).toEqual([value]);
  });

  it("should return the same readonly array when input is a readonly array", () => {
    const arr = [1, 2, 3] as const;
    expect(ensureArray(arr)).toBe(arr);
  });
});
