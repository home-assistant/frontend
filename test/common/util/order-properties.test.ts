import { describe, it, expect } from "vitest";
import { orderProperties } from "../../../src/common/util/order-properties";

describe("orderProperties", () => {
  it("should order properties according to the specified order", () => {
    const obj = {
      c: "third",
      a: "first",
      b: "second",
    };
    const order = ["a", "b", "c"];

    const result = orderProperties(obj, order);

    expect(Object.keys(result)).toEqual(["a", "b", "c"]);
    expect(result).toEqual({
      a: "first",
      b: "second",
      c: "third",
    });
  });

  it("should place properties not in order at the end", () => {
    const obj = {
      z: "last",
      a: "first",
      x: "extra",
      b: "second",
    };
    const order = ["a", "b"];

    const result = orderProperties(obj, order);

    expect(Object.keys(result)).toEqual(["a", "b", "z", "x"]);
    expect(result).toEqual({
      a: "first",
      b: "second",
      z: "last",
      x: "extra",
    });
  });

  it("should handle empty objects", () => {
    const obj = {};
    const order = ["a", "b", "c"];

    const result = orderProperties(obj, order);

    expect(Object.keys(result)).toEqual([]);
    expect(result).toEqual({});
  });

  it("should handle empty order array", () => {
    const obj = {
      c: "third",
      a: "first",
      b: "second",
    };
    const order: string[] = [];

    const result = orderProperties(obj, order);

    // Should preserve original order when no ordering is specified
    expect(Object.keys(result)).toEqual(["c", "a", "b"]);
    expect(result).toEqual({
      c: "third",
      a: "first",
      b: "second",
    });
  });

  it("should skip keys in order that don't exist in object", () => {
    const obj = {
      b: "second",
      d: "fourth",
    };
    const order = ["a", "b", "c", "d"];

    const result = orderProperties(obj, order);

    expect(Object.keys(result)).toEqual(["b", "d"]);
    expect(result).toEqual({
      b: "second",
      d: "fourth",
    });
  });

  it("should preserve type information", () => {
    const obj = {
      num: 42,
      str: "hello",
      bool: true,
      arr: [1, 2, 3],
      obj: { nested: "value" },
    };
    const order = ["str", "num", "bool"];

    const result = orderProperties(obj, order);

    expect(result.num).toBe(42);
    expect(result.str).toBe("hello");
    expect(result.bool).toBe(true);
    expect(result.arr).toEqual([1, 2, 3]);
    expect(result.obj).toEqual({ nested: "value" });
  });

  it("should work with complex card config-like objects", () => {
    const config = {
      features: ["feature1"],
      entity: "sensor.test",
      vertical: false,
      name: "Test Card",
      icon: "mdi:test",
      type: "tile",
    };
    const order = ["type", "entity", "name", "icon", "vertical"];

    const result = orderProperties(config, order);

    expect(Object.keys(result)).toEqual([
      "type",
      "entity",
      "name",
      "icon",
      "vertical",
      "features", // extra property at the end
    ]);
    expect(result.type).toBe("tile");
    expect(result.entity).toBe("sensor.test");
    expect(result.features).toEqual(["feature1"]);
  });

  it("should handle readonly order arrays", () => {
    const obj = { c: 3, a: 1, b: 2 };
    const order = ["a", "b", "c"] as const;

    const result = orderProperties(obj, order);

    expect(Object.keys(result)).toEqual(["a", "b", "c"]);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should handle objects with undefined and null values", () => {
    const obj = {
      defined: "value",
      nullValue: null,
      undefinedValue: undefined,
      zero: 0,
      emptyString: "",
    };
    const order = ["nullValue", "defined", "zero"];

    const result = orderProperties(obj, order);

    expect(Object.keys(result)).toEqual([
      "nullValue",
      "defined",
      "zero",
      "undefinedValue",
      "emptyString",
    ]);
    expect(result.nullValue).toBeNull();
    expect(result.undefinedValue).toBeUndefined();
    expect(result.zero).toBe(0);
    expect(result.emptyString).toBe("");
  });
});
