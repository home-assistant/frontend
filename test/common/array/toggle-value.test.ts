import { describe, expect, it } from "vitest";
import { toggleValue } from "../../../src/common/array/toggle-value";

describe("toggleValue", () => {
  it("works", () => {
    expect(toggleValue(undefined, "a", true)).toEqual(["a"]);
    expect(toggleValue(["a", "b"], "c", true)).toEqual(["a", "b", "c"]);
    expect(toggleValue(["a", "b"], "a", true)).toEqual(["b", "a"]);
    expect(toggleValue(["a", "b"], "a", false)).toEqual(["b"]);
    expect(toggleValue(undefined, "a", false)).toEqual([]);
  });
});
