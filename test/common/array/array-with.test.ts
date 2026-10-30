import { describe, expect, it } from "vitest";
import { arrayWith, arrayWithout } from "../../../src/common/array/array-with";

describe("arrayWith", () => {
  it("works", () => {
    expect(arrayWith(undefined, "a")).toEqual(["a"]);
    expect(arrayWith(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(arrayWith(["a", "b"], "a")).toEqual(["a", "b"]);
  });
});

describe("arrayWithout", () => {
  it("works", () => {
    expect(arrayWithout(["a", "b"], "a")).toEqual(["b"]);
    expect(arrayWithout(["a", "b"], "c")).toEqual(["a", "b"]);
    expect(arrayWithout(undefined, "a")).toEqual([]);
  });
});
