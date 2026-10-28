import { describe, expect, it } from "vitest";
import {
  addValue,
  removeValue,
} from "../../../src/common/array/add-remove-value";

describe("addValue", () => {
  it("works", () => {
    expect(addValue(undefined, "a")).toEqual(["a"]);
    expect(addValue(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(addValue(["a", "b"], "a")).toEqual(["a", "b"]);
  });
});

describe("removeValue", () => {
  it("works", () => {
    expect(removeValue(["a", "b"], "a")).toEqual(["b"]);
    expect(removeValue(["a", "b"], "c")).toEqual(["a", "b"]);
    expect(removeValue(undefined, "a")).toEqual([]);
  });
});
