import { describe, expect, it } from "vitest";
import { deepEqual } from "../../../src/common/util/deep-equal";

describe("deepEqual", () => {
  it("ignores key order by default", () => {
    expect(
      deepEqual({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })
    ).toBe(true);
  });

  it("detects reordered keys at any depth with compareKeyOrder", () => {
    const options = { compareKeyOrder: true };
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }, options)).toBe(false);
    expect(
      deepEqual(
        { list: [{ entity_id: "light.a", to: "on" }] },
        { list: [{ to: "on", entity_id: "light.a" }] },
        options
      )
    ).toBe(false);
    expect(
      deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }, options)
    ).toBe(true);
  });
});
