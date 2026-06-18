import { describe, expect, it } from "vitest";
import { deepEqual } from "../../../src/common/util/deep-equal";
import { stripToggleDefaults } from "../../../src/common/util/strip-toggle-defaults";

describe("stripToggleDefaults", () => {
  it("removes keys whose value is false", () => {
    expect(stripToggleDefaults({ a: 1, b: false })).toEqual({ a: 1 });
  });

  it("removes keys whose value is undefined", () => {
    expect(stripToggleDefaults({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it("keeps other falsy values (0, empty string, null)", () => {
    expect(stripToggleDefaults({ a: 0, b: "", c: null })).toEqual({
      a: 0,
      b: "",
      c: null,
    });
  });

  it("keeps true and non-empty values", () => {
    const obj = { a: true, b: "x", c: { d: 1 }, e: [1, 2] };
    expect(stripToggleDefaults(obj)).toEqual(obj);
  });

  it("does not recurse into nested objects", () => {
    expect(stripToggleDefaults({ a: { b: false } })).toEqual({
      a: { b: false },
    });
  });

  it("returns non-plain-object values unchanged", () => {
    expect(stripToggleDefaults(undefined)).toBe(undefined);
    expect(stripToggleDefaults(null)).toBe(null);
    expect(stripToggleDefaults(5)).toBe(5);
    expect(stripToggleDefaults("x")).toBe("x");
    const arr = [1, false, undefined];
    expect(stripToggleDefaults(arr)).toBe(arr);
  });
});

// Mirrors how the dirty-state mixin derives `isEffectiveDirty`:
// `!deepEqual(stripToggleDefaults(initial), stripToggleDefaults(current))`.
describe("effective dirty comparison", () => {
  const effectivelyEqual = (a: unknown, b: unknown) =>
    deepEqual(stripToggleDefaults(a), stripToggleDefaults(b));

  it("treats an added explicit false as unchanged", () => {
    expect(
      effectivelyEqual(
        { type: "tile", entity: "light.x" },
        { type: "tile", entity: "light.x", show_entity_picture: false }
      )
    ).toBe(true);
  });

  it("treats a removed explicit false as unchanged", () => {
    expect(
      effectivelyEqual(
        { type: "tile", entity: "light.x", show_entity_picture: false },
        { type: "tile", entity: "light.x" }
      )
    ).toBe(true);
  });

  it("treats an added explicit true as changed", () => {
    expect(
      effectivelyEqual(
        { type: "tile", entity: "light.x" },
        { type: "tile", entity: "light.x", show_entity_picture: true }
      )
    ).toBe(false);
  });

  it("treats a real value change as changed", () => {
    expect(
      effectivelyEqual(
        { type: "tile", entity: "light.x" },
        { type: "tile", entity: "light.y" }
      )
    ).toBe(false);
  });

  it("treats a 0 value as changed (only false/undefined collapse)", () => {
    expect(
      effectivelyEqual({ type: "tile" }, { type: "tile", columns: 0 })
    ).toBe(false);
  });
});
