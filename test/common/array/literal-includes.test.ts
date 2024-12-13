import { describe, it, expect } from "vitest";
import { arrayLiteralIncludes } from "../../../src/common/array/literal-includes";

describe("arrayLiteralIncludes", () => {
  const array = ["a", "b", "c"] as const;
  const includes = arrayLiteralIncludes(array);

  it("should return true if the element is in the array", () => {
    expect(includes("a")).toBe(true);
    expect(includes("b")).toBe(true);
    expect(includes("c")).toBe(true);
  });

  it("should return false if the element is not in the array", () => {
    expect(includes("d")).toBe(false);
    expect(includes(1)).toBe(false);
  });

  it("should respect the fromIndex parameter", () => {
    expect(includes("a", 1)).toBe(false);
    expect(includes("b", 1)).toBe(true);
  });

  it("should handle empty arrays", () => {
    const emptyArray = [] as const;
    const includesEmpty = arrayLiteralIncludes(emptyArray);

    expect(includesEmpty("a")).toBe(false);
  });
});
